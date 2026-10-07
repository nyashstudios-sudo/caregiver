"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { darajaConfigured, stkPush, b2cPayment, normalizeMsisdn } from "@/lib/daraja";
import { debitWallet, reverseDebit, getBalance } from "@/lib/payments";
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

/* ------------------------------ Withdraw ---------------------------------- */

const withdrawSchema = z.object({
  amount: z.coerce
    .number({ message: "Enter a valid amount" })
    .min(100, "Minimum withdrawal is KES 100")
    .max(70000, "Maximum single withdrawal is KES 70,000"),
  phone: z.string().trim().min(1, "Enter the M-Pesa number to receive the money"),
});

/** Withdraw wallet balance to M-Pesa via B2C (atomic debit + reversal). */
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

  // Hold the funds first so two concurrent requests cannot overdraw.
  try {
    await debitWallet(user.id, amount);
  } catch {
    registerFailure(throttleKey);
    return { error: "Insufficient balance — the withdrawal was not started" };
  }

  try {
    const b2c = await b2cPayment(msisdn, amount, "Withdrawal", "Caregiver wallet");
    await prisma.payment.create({
      data: {
        userId: user.id,
        kind: "WITHDRAWAL",
        status: "PENDING",
        amount,
        phone: msisdn,
        conversationId: b2c.conversationId || null,
        merchantRequestId: b2c.originatorConversationId || null,
      },
    });
    clearFailures(throttleKey);
    revalidatePath("/wallet");
    return { ok: true, devCode: "Withdrawal queued — M-Pesa will deliver it shortly." };
  } catch (err) {
    // B2C never left the building → give the money back immediately.
    await reverseDebit(user.id, amount);
    registerFailure(throttleKey);
    return {
      error: err instanceof Error ? err.message : "The withdrawal failed and your balance was restored",
    };
  }
}
