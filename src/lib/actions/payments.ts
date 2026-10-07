"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { darajaConfigured, stkPush, b2cPayment, normalizeMsisdn } from "@/lib/daraja";
import { payBookingFromBalance, logLedger, creditWallet, getBalance } from "@/lib/payments";
import { registerFailure, isBlocked, clearFailures } from "@/lib/throttle";
import type { ActionState } from "./state";

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}

/* ----------------------------- Pay a booking ----------------------------- */

const paySchema = z.object({
  bookingId: z.string().min(1, "Booking not found"),
  phone: z.string().trim().min(1, "Enter the M-Pesa number to pay from"),
});

/**
 * Client pays their booking through STK Push. Amount always comes from the
 * booking row (server-computed at booking time) — never from the form.
 */
export async function payBookingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/dashboard");
  if (user.role !== "CLIENT") return { error: "Only the booking client can pay" };

  const parsed = paySchema.safeParse({
    bookingId: formData.get("bookingId"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  if (!darajaConfigured()) {
    return {
      error:
        "M-Pesa payments are not configured yet. Set the DARAJA_* environment variables to enable them.",
    };
  }

  const msisdn = normalizeMsisdn(parsed.data.phone);
  if (!msisdn) return { error: "Enter a valid Safaricom number, e.g. 0712345678" };

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking || booking.clientId !== user.id) return { error: "Booking not found" };
  if (booking.paidAt) return { error: "This booking has already been paid" };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { error: "This booking can no longer be paid" };
  }
  const amount = booking.amount ?? 0;
  if (amount <= 0) return { error: "This booking has no amount attached" };

  const wholeKes = Math.round(amount);
  try {
    const stk = await stkPush(
      msisdn,
      wholeKes,
      `CARE${booking.id.slice(-6).toUpperCase()}`,
      "Caregiver booking"
    );

    // Persist a PENDING payment keyed by the checkout id — the callback
    // later flips it to SUCCESS after re-verifying the amount.
    await prisma.payment.create({
      data: {
        userId: user.id,
        bookingId: booking.id,
        kind: "BOOKING_PAYMENT",
        status: "PENDING",
        amount: wholeKes,
        phone: msisdn,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId || null,
      },
    });

    revalidatePath("/dashboard");
    return { ok: true, devCode: stk.customerMessage };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start the M-Pesa payment" };
  }
}

/* --------------------------- Pay from balance ---------------------------- */

const walletPaySchema = z.object({
  bookingId: z.string().min(1, "Booking not found"),
});

/**
 * Client pays their booking straight from wallet balance — no STK prompt.
 * The debit and the booking marker move in one transaction, so two tabs
 * paying the same booking can never double-charge or overdraw.
 */
export async function payBookingFromWalletAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/dashboard");
  if (user.role !== "CLIENT") return { error: "Only the booking client can pay" };

  const parsed = walletPaySchema.safeParse({ bookingId: formData.get("bookingId") });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking || booking.clientId !== user.id) return { error: "Booking not found" };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { error: "This booking can no longer be paid" };
  }
  const amount = Math.round(((booking.amount ?? 0) + Number.EPSILON) * 100) / 100;
  if (amount <= 0) return { error: "This booking has no amount attached" };

  const result = await payBookingFromBalance(user.id, booking, amount);
  if (!result.ok) return { error: result.reason };

  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  return { ok: true, devCode: `Paid KES ${amount.toLocaleString()} from your wallet balance.` };
}

/* ------------------------------- Deposit --------------------------------- */

const depositSchema = z.object({
  amount: z.coerce
    .number({ message: "Enter a valid amount" })
    .min(100, "Minimum deposit is KES 100")
    .max(70000, "Maximum single deposit is KES 70,000"),
  phone: z.string().trim().min(1, "Enter the M-Pesa number to pay from"),
});

/**
 * Top up wallet balance with an M-Pesa STK prompt. The Payment row is
 * created PENDING; the Daraja callback credits the wallet exactly once.
 */
export async function depositAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/wallet");

  const throttleKey = `deposit:${user.id}`;
  if (isBlocked(throttleKey)) {
    return { error: "Too many deposit attempts. Please wait about 10 minutes." };
  }

  const parsed = depositSchema.safeParse({
    amount: formData.get("amount"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    registerFailure(throttleKey);
    return { error: zodError(parsed.error) };
  }

  if (!darajaConfigured()) {
    return {
      error:
        "M-Pesa deposits are not configured yet. Set the DARAJA_* environment variables to enable them.",
    };
  }

  const msisdn = normalizeMsisdn(parsed.data.phone);
  if (!msisdn) {
    registerFailure(throttleKey);
    return { error: "Enter a valid Safaricom number, e.g. 0712345678" };
  }

  const wholeKes = Math.round(parsed.data.amount);
  try {
    const stk = await stkPush(
      msisdn,
      wholeKes,
      `CGD${Date.now().toString(36).toUpperCase().slice(-8)}`,
      "Caregiver wallet deposit"
    );

    await prisma.payment.create({
      data: {
        userId: user.id,
        kind: "DEPOSIT",
        status: "PENDING",
        amount: wholeKes,
        phone: msisdn,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId || null,
      },
    });

    clearFailures(throttleKey);
    revalidatePath("/wallet");
    return { ok: true, devCode: stk.customerMessage };
  } catch (err) {
    registerFailure(throttleKey);
    return { error: err instanceof Error ? err.message : "Could not start the M-Pesa deposit" };
  }
}

/* ------------------------------ Withdraw ---------------------------------- */

const withdrawSchema = z.object({
  amount: z.coerce
    .number({ message: "Enter a valid amount" })
    .min(100, "Minimum withdrawal is KES 100")
    .max(70000, "Maximum single withdrawal is KES 70,000"),
  phone: z.string().trim().min(1, "Enter the M-Pesa number to receive the money"),
});

/**
 * Withdraw wallet balance to M-Pesa via B2C.
 * Order of operations keeps the books consistent at every instant:
 *   1. one transaction: conditional debit + PENDING payment + ledger row
 *   2. B2C request leaves the building
 *   3a. success → conversation ids recorded on the payment
 *   3b. failure → one transaction: restore credit + reversal ledger + FAILED
 */
export async function withdrawAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/wallet");

  const throttleKey = `withdraw:${user.id}`;
  if (isBlocked(throttleKey)) {
    return { error: "Too many withdrawal attempts. Please wait about 10 minutes." };
  }

  const parsed = withdrawSchema.safeParse({
    amount: formData.get("amount"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  if (!darajaConfigured()) {
    return {
      error:
        "M-Pesa withdrawals are not configured yet. Set the DARAJA_* environment variables to enable them.",
    };
  }

  const msisdn = normalizeMsisdn(parsed.data.phone);
  if (!msisdn) return { error: "Enter a valid Safaricom number, e.g. 0712345678" };

  const amount = Math.round(parsed.data.amount); // whole KES across the rail

  // Phone on the account wins: payouts only go to the number the user owns.
  if (user.email) {
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });
    if (record?.phone && record.phone !== msisdn) {
      registerFailure(throttleKey);
      return {
        error:
          "Withdrawals must go to your registered account phone. Update it in Account settings first.",
      };
    }
  }

  const balance = await getBalance(user.id);
  if (balance < amount) {
    return { error: `Insufficient balance (you have KES ${balance.toFixed(2)})` };
  }

  // 1. Hold the funds, open the payment and stamp the ledger atomically —
  //    two concurrent requests can never overdraw past the balance check.
  let paymentId: string;
  try {
    paymentId = await prisma.$transaction(async (tx) => {
      const res = await tx.wallet.updateMany({
        where: { userId: user.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (res.count === 0) throw new Error("Insufficient balance — the withdrawal was not started");
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          kind: "WITHDRAWAL",
          status: "PENDING",
          amount,
          phone: msisdn,
        },
      });
      await logLedger(tx, {
        userId: user.id,
        kind: "WITHDRAWAL",
        amount: -amount,
        paymentId: payment.id,
        description: `M-Pesa withdrawal to ${msisdn}`,
      });
      return payment.id;
    });
  } catch {
    registerFailure(throttleKey);
    return { error: "Insufficient balance — the withdrawal was not started" };
  }

  // 2/3. Send the B2C; wire the conversation ids back onto the payment.
  try {
    const b2c = await b2cPayment(msisdn, amount, "Withdrawal", "Caregiver wallet");
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        conversationId: b2c.conversationId || null,
        merchantRequestId: b2c.originatorConversationId || null,
      },
    });
    clearFailures(throttleKey);
    revalidatePath("/wallet");
    return { ok: true, devCode: "Withdrawal queued — M-Pesa will deliver it shortly." };
  } catch (err) {
    // 3b. The transfer never left → restore the balance + ledger, mark failed.
    await prisma
      .$transaction(async (tx) => {
        await creditWallet(tx, user.id, amount);
        await tx.payment.updateMany({
          where: { id: paymentId, status: "PENDING" },
          data: { status: "FAILED", failureReason: "Transfer could not be started" },
        });
        await logLedger(tx, {
          userId: user.id,
          kind: "WITHDRAWAL_REVERSAL",
          amount,
          paymentId,
          description: "Withdrawal failed — balance restored",
        });
      })
      .catch(() => undefined);
    registerFailure(throttleKey);
    return {
      error: err instanceof Error ? err.message : "The withdrawal failed and your balance was restored",
    };
  }
}

/* ----------------------------- Tax profile ------------------------------- */

const taxProfileSchema = z.object({
  kraPin: z
    .string()
    .trim()
    .regex(/^[A-Za-z]\d{9}[A-Za-z]$/, "KRA PIN looks like A123456789X — letter, 9 digits, letter")
    .or(z.literal(""))
    .transform((v) => v.toUpperCase()),
});

/** Worker saves their KRA PIN — printed on withholding-tax statements. */
export async function saveTaxProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/wallet");
  if (user.role !== "WORKER") return { error: "Tax records are for worker accounts" };

  const parsed = taxProfileSchema.safeParse({ kraPin: formData.get("kraPin") });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const kraPin = parsed.data.kraPin || null;
  const existing = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true, fullName: true },
  });

  if (existing) {
    await prisma.profile.update({ where: { id: existing.id }, data: { kraPin } });
  } else {
    // Workers created before profiles existed (e.g. via Google) still need
    // somewhere to store the PIN — fill the required profile fields.
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, profile: true },
    });
    if (!row?.profile) {
      await prisma.profile.create({
        data: {
          userId: user.id,
          fullName: user.name || row?.email?.split("@")[0] || "Caregiver",
          location: "Kenya",
          kraPin,
        },
      });
    }
  }

  revalidatePath("/wallet/tax");
  return { ok: true, devCode: kraPin ? "KRA PIN saved." : "KRA PIN cleared." };
}
