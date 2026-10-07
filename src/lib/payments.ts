/**
 * Escrow & wallet service — the money logic around Daraja.
 *
 * Flow (per readme + brief):
 *  1. Client pays a booking via STK push → Payment(BOOKING_PAYMENT, SUCCESS)
 *     and Booking.paidAt set. Funds are held by the platform (escrow).
 *  2. Worker marks the job COMPLETED → platform credits the worker's Wallet
 *     (earnings minus the platform fee).
 *  3. Booking CANCELLED after payment → client's wallet is credited (refund)
 *     so they can withdraw it to M-Pesa, or reuse it on the next booking.
 *  4. Any user with a wallet balance can withdraw via B2C to their M-Pesa.
 *
 * Invariants:
 *  - Only whole KES cross the Daraja rails (Math.round).
 *  - release/refund are idempotent via releasedAt/refundedAt markers.
 *  - Wallet debits happen inside a transaction with a balance check.
 */

import { prisma } from "./prisma";
import { getPlatformFeePct } from "./settings";
import type { Booking } from "@prisma/client";

/** Platform commission taken from worker earnings — DB override → env → 10%. */
export function platformFeePct(): number {
  const raw = Number(process.env.PLATFORM_FEE_PCT ?? 10);
  if (!Number.isFinite(raw) || raw < 0 || raw > 50) return 10;
  return raw;
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

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
 * Release escrowed funds to the worker after COMPLETED.
 * Idempotent — safe to call from the booking action and from retries.
 */
export async function releaseEarnings(booking: Booking): Promise<boolean> {
  if (!booking.paidAt || booking.releasedAt) return false;

  const gross = booking.amount ?? 0;
  if (gross <= 0) return false;
  const fee = (gross * (await getPlatformFeePct())) / 100;
  const feeRounded = Math.round(fee * 100) / 100;
  const net = Math.round((gross - fee) * 100) / 100;

  return prisma.$transaction(async (tx) => {
    // Conditional marker: only one caller can flip releasedAt → no double credit.
    const res = await tx.booking.updateMany({
      where: { id: booking.id, releasedAt: null, paidAt: { not: null } },
      data: { releasedAt: new Date(), feeAmount: feeRounded },
    });
    if (res.count === 0) return false;
    await creditWallet(tx, booking.workerId, net);
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
    await creditWallet(tx, booking.clientId, Math.round(gross * 100) / 100);
    return true;
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
 * Debit a wallet atomically. Throws when funds are insufficient or negative.
 * Used by withdrawal requests before the B2C call leaves the building.
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

/** Reverse a failed withdrawal debit (B2C rejected / timed out). */
export async function reverseDebit(userId: string, amount: number): Promise<void> {
  await creditWallet(prisma, userId, amount);
}
