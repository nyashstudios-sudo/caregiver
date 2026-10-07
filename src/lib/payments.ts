/**
 * Escrow, wallet & finance service — the money logic around Daraja.
 *
 * Flow:
 *  1. Client funds the wallet with an M-Pesa STK deposit (or pays a booking
 *     directly by STK). Payment rows record every rail movement.
 *  2. Paying from balance moves wallet → escrow atomically (conditional
 *     debit, so concurrent spends can never overdraw).
 *  3. Worker marks the job COMPLETED → escrow releases to the worker's
 *     wallet: platform fee withheld, KRA withholding tax (ITA s.35)
 *     deducted at source and recorded for the worker's tax statement,
 *     net credited — all in one transaction, idempotent via releasedAt.
 *  4. Cancellation refunds escrow back to the client's wallet.
 *  5. Anyone with a balance withdraws via B2C to their own M-Pesa number;
 *     failed transfers are restored exactly once.
 *
 * Invariants:
 *  - Only whole KES cross the Daraja rails (Math.round).
 *  - release/refund are idempotent via releasedAt/refundedAt markers.
 *  - Wallet debits happen inside a transaction with a balance check.
 *  - Every balance change writes an append-only LedgerEntry carrying the
 *    resulting balance, inside the same transaction as the change itself —
 *    the ledger can always be replayed to the current balance.
 *  - Tax rates are snapshotted per earning (TaxWithholding), so changing
 *    the admin setting never rewrites an issued statement.
 */

import { prisma } from "./prisma";
import { getPlatformFeePct, getWhtRatePct } from "./settings";
import type { Booking, LedgerKind } from "@prisma/client";

/** Platform commission taken from worker earnings — DB override → env → 10%. */
export function platformFeePct(): number {
  const raw = Number(process.env.PLATFORM_FEE_PCT ?? 10);
  if (!Number.isFinite(raw) || raw < 0 || raw > 50) return 10;
  return raw;
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Append a ledger row for a wallet movement that already happened in this
 * transaction (or on this db handle). Reads the wallet's current balance to
 * stamp balanceAfter — call it after the credit/debit, never before.
 */
export async function logLedger(
  db: Tx | typeof prisma,
  entry: {
    userId: string;
    kind: LedgerKind;
    /** Signed KES: positive = money in, negative = money out. */
    amount: number;
    bookingId?: string | null;
    paymentId?: string | null;
    description?: string | null;
  }
): Promise<void> {
  const wallet = await db.wallet.findUnique({
    where: { userId: entry.userId },
    select: { balance: true },
  });
  await db.ledgerEntry.create({
    data: {
      userId: entry.userId,
      kind: entry.kind,
      amount: entry.amount,
      balanceAfter: wallet?.balance ?? 0,
      bookingId: entry.bookingId ?? null,
      paymentId: entry.paymentId ?? null,
      description: entry.description ?? null,
    },
  });
}

/** Credit a wallet (create if missing) — usable inside or outside a tx. */
export async function creditWallet(
  db: Tx | typeof prisma,
  userId: string,
  amount: number
): Promise<void> {
  if (!(amount > 0)) throw new Error("creditWallet: amount must be positive");
  await db.wallet.upsert({
    where: { userId },
    update: { balance: { increment: amount } },
    create: { userId, balance: amount },
  });
}

/**
 * Release escrowed funds to the worker after COMPLETED: platform fee and
 * KRA withholding tax come off the gross, the net hits the wallet, and the
 * split is persisted (Booking.feeAmount/whtAmount + TaxWithholding) for
 * statements. Idempotent — safe to call from the booking action and retries.
 */
export async function releaseEarnings(booking: Booking): Promise<boolean> {
  if (!booking.paidAt || booking.releasedAt) return false;

  const gross = booking.amount ?? 0;
  if (gross <= 0) return false;

  const feePct = await getPlatformFeePct();
  const whtPct = await getWhtRatePct();
  const fee = round2((gross * feePct) / 100);
  // Whole shillings of tax, never exceeding what's left after the fee —
  // a 0% rate simply skips withholding.
  const wht =
    whtPct > 0 ? Math.min(Math.round((gross * whtPct) / 100), Math.floor(gross - fee)) : 0;
  const net = round2(gross - fee - wht);
  if (net < 0) return false;

  return prisma.$transaction(async (tx) => {
    // Conditional marker: only one caller can flip releasedAt → no double credit.
    const res = await tx.booking.updateMany({
      where: { id: booking.id, releasedAt: null, paidAt: { not: null } },
      data: {
        releasedAt: new Date(),
        feeAmount: fee,
        whtAmount: wht > 0 ? wht : null,
      },
    });
    if (res.count === 0) return false;

    if (net > 0) await creditWallet(tx, booking.workerId, net);

    if (wht > 0) {
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      await tx.taxWithholding.create({
        data: {
          workerId: booking.workerId,
          bookingId: booking.id,
          gross,
          fee,
          whtRate: whtPct,
          whtAmount: wht,
          net,
          period,
        },
      });
    }

    await logLedger(tx, {
      userId: booking.workerId,
      kind: "RELEASE",
      amount: net,
      bookingId: booking.id,
      description:
        wht > 0
          ? `Earnings released — KES ${fee} platform fee, KES ${wht} withholding tax (KRA)`
          : `Earnings released — KES ${fee} platform fee`,
    });
    return true;
  });
}

/**
 * Refund a paid booking to the client's wallet after CANCELLATION.
 * Idempotent via refundedAt.
 */
export async function refundToWallet(booking: Booking): Promise<boolean> {
  if (!booking.paidAt || booking.refundedAt || booking.releasedAt) return false;

  const gross = booking.amount ?? 0;
  if (gross <= 0) return false;

  return prisma.$transaction(async (tx) => {
    const res = await tx.booking.updateMany({
      where: { id: booking.id, refundedAt: null, paidAt: { not: null }, releasedAt: null },
      data: { refundedAt: new Date() },
    });
    if (res.count === 0) return false;
    const amount = round2(gross);
    await creditWallet(tx, booking.clientId, amount);
    await logLedger(tx, {
      userId: booking.clientId,
      kind: "REFUND",
      amount,
      bookingId: booking.id,
      description: `Refund for cancelled job on ${booking.serviceDate.toISOString().slice(0, 10)}`,
    });
    return true;
  });
}

/**
 * Settle an M-Pesa deposit: flip the payment to SUCCESS and credit the
 * wallet in one transaction (the callback re-verifies the amount first).
 * Idempotent through the PENDING guard on the payment row.
 */
export async function creditDeposit(
  paymentId: string,
  receipt: string | null = null
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const res = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING", kind: "DEPOSIT" },
      data: { status: "SUCCESS", mpesaReceipt: receipt },
    });
    if (res.count === 0) return false;
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return false;
    await creditWallet(tx, payment.userId, payment.amount);
    await logLedger(tx, {
      userId: payment.userId,
      kind: "DEPOSIT",
      amount: payment.amount,
      paymentId,
      description: payment.mpesaReceipt ? `M-Pesa deposit ${payment.mpesaReceipt}` : "Deposit",
    });
    return true;
  });
}

/**
 * Move funds wallet → escrow for a booking the client is paying from
 * balance. Conditional debit inside the same transaction as the booking
 * marker, so two concurrent spends cannot overdraw or double-pay.
 */
export async function payBookingFromBalance(
  clientId: string,
  booking: Booking,
  amount: number
): Promise<{ ok: true; paymentId: string } | { ok: false; reason: string }> {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: clientId } });
    if (!wallet || wallet.balance < amount) {
      return { ok: false, reason: "Insufficient wallet balance" } as const;
    }

    const paid = await tx.booking.updateMany({
      where: { id: booking.id, paidAt: null },
      data: { paidAt: new Date() },
    });
    if (paid.count === 0) return { ok: false, reason: "This booking was already paid" } as const;

    await tx.wallet.update({
      where: { userId: clientId },
      data: { balance: { decrement: amount } },
    });

    const payment = await tx.payment.create({
      data: {
        userId: clientId,
        bookingId: booking.id,
        kind: "BOOKING_PAYMENT",
        status: "SUCCESS",
        amount,
        conversationId: "WALLET",
      },
    });
    await logLedger(tx, {
      userId: clientId,
      kind: "BOOKING_PAYMENT",
      amount: -amount,
      bookingId: booking.id,
      paymentId: payment.id,
      description: "Paid from wallet balance (escrow)",
    });
    return { ok: true, paymentId: payment.id } as const;
  });
}

/** Current wallet balance (0 when no wallet row exists). */
export async function getBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return wallet?.balance ?? 0;
}

/**
 * Debit a wallet atomically (no ledger — the caller logs the matching
 * entry once its Payment row exists). Throws when funds are insufficient.
 */
export async function debitWallet(userId: string, amount: number): Promise<void> {
  if (!(amount > 0)) throw new Error("debitWallet: amount must be positive");

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    const balance = wallet?.balance ?? 0;
    if (balance < amount) throw new Error("Insufficient wallet balance");
    if (wallet) {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });
    } else {
      throw new Error("No wallet found");
    }
  });
}

/** Restore a failed withdrawal debit (B2C rejected / never left). */
export async function reverseDebit(userId: string, amount: number): Promise<void> {
  await creditWallet(prisma, userId, amount);
}
