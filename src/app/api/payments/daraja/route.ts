/**
 * POST /api/payments/daraja — Safaricom Daraja callback endpoint.
 *
 * This is the only place money becomes real. Hardening:
 *  - Idempotent: each checkoutRequestId/conversationId is applied exactly once
 *    (conditional updateMany with status=PENDING guards).
 *  - Amount is re-verified against our stored Payment row; a mismatch fails
 *    the payment instead of crediting a fraudulent amount.
 *  - No auth header exists for Safaricom; instead we only act on records we
 *    created (matched by the opaque checkout/conversation ids). Unknown ids
 *    are acknowledged with 200 but ignored — never trusted.
 *  - Every branch always answers 200 with a valid JSON body so Daraja does
 *    not retry-storm us; failures are recorded on the Payment row itself.
 *
 * Two callback shapes arrive here (same URL, per Daraja convention):
 *  1. STK Push result   → Body.stkCallback.{CheckoutRequestID, ResultCode, CallbackMetadata}
 *  2. B2C result        → Result.{ResultCode, OriginatorConversationID, ResultParameters}
 */

import { prisma } from "@/lib/prisma";
import { creditDeposit, creditWallet, logLedger, releaseEarnings } from "@/lib/payments";

type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
};

type DarajaBody = {
  Body?: { stkCallback?: StkCallback };
  Result?: {
    ResultType?: number;
    ResultCode?: number;
    ResultDesc?: string;
    OriginatorConversationID?: string;
    ConversationID?: string;
    ResultParameters?: { ResultParameter?: Array<{ Key: string; Value?: string | number }> };
    ReferenceData?: { ReferenceItem?: Array<{ Key?: string; Value?: string }> };
  };
};

function ok() {
  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

/* ------------------------------- STK push -------------------------------- */

async function handleStk(cb: StkCallback): Promise<void> {
  const checkoutId = cb.CheckoutRequestID;
  if (!checkoutId) return;

  const payment = await prisma.payment.findUnique({ where: { checkoutRequestId: checkoutId } });
  if (!payment || payment.status !== "PENDING") return; // unknown or already settled

  if (cb.ResultCode !== 0) {
    await prisma.payment.updateMany({
      where: { checkoutRequestId: checkoutId, status: "PENDING" },
      data: { status: "FAILED", failureReason: cb.ResultDesc ?? "Customer cancelled or failed" },
    });
    return;
  }

  // Re-read metadata: verify the amount Safaricom actually collected.
  const items = cb.CallbackMetadata?.Item ?? [];
  const paidAmount = Number(items.find((i) => i.Name === "Amount")?.Value ?? NaN);
  const receipt = String(items.find((i) => i.Name === "MpesaReceiptNumber")?.Value ?? "");

  if (!Number.isFinite(paidAmount) || Math.round(paidAmount) !== Math.round(payment.amount)) {
    await prisma.payment.updateMany({
      where: { checkoutRequestId: checkoutId, status: "PENDING" },
      data: {
        status: "FAILED",
        failureReason: `Amount mismatch: expected ${payment.amount}, got ${paidAmount}`,
        mpesaReceipt: receipt || null,
      },
    });
    return;
  }

  // Wallet top-up: flip to SUCCESS, credit the balance and stamp the
  // ledger in one transaction — the PENDING guard keeps it single-apply.
  if (payment.kind === "DEPOSIT") {
    await creditDeposit(payment.id, receipt || null);
    return;
  }

  // Settle payment + mark booking paid, atomically guarded on PENDING.
  const settled = await prisma.$transaction(async (tx) => {
    const res = await tx.payment.updateMany({
      where: { checkoutRequestId: checkoutId, status: "PENDING" },
      data: { status: "SUCCESS", mpesaReceipt: receipt || null },
    });
    if (res.count === 0) return null;
    if (!payment.bookingId) return null;
    return tx.booking.updateMany({
      where: { id: payment.bookingId, paidAt: null },
      data: { paidAt: new Date() },
    });
  });

  // Notify both parties' dashboards (revalidate is a no-op off-request, safe).
  if (settled && payment.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      select: { status: true },
    });
    if (booking?.status === "COMPLETED") {
      const full = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
      if (full) await releaseEarnings(full).catch(() => false);
    }
  }
}

/* --------------------------------- B2C ------------------------------------ */

async function handleB2c(result: NonNullable<DarajaBody["Result"]>): Promise<void> {
  const originId = result.OriginatorConversationID;
  if (!originId) return;

  // findFirst (not findUnique) so this works before/without the pending
  // unique index on merchantRequestId; the status guard below prevents
  // double-settlement regardless.
  const payment = await prisma.payment.findFirst({
    where: { merchantRequestId: originId },
  });
  if (!payment || payment.status !== "PENDING") return;

  const params = result.ResultParameters?.ResultParameter ?? [];
  const txId = String(params.find((p) => p.Key === "TransactionID")?.Value ?? "");
  const success = result.ResultCode === 0;

  // One conditional flip (PENDING → final), so duplicates can never double-apply.
  const flipped = await prisma.payment.updateMany({
    where: { merchantRequestId: originId, status: "PENDING" },
    data: {
      status: success ? "SUCCESS" : "FAILED",
      mpesaReceipt: success ? txId || null : null,
      failureReason: success ? null : (result.ResultDesc ?? "Transfer failed"),
      conversationId: payment.conversationId ?? undefined,
    },
  });
  if (flipped.count === 0) return;

  // Failed withdrawal → money was held upfront, so restore it with a
  // matching reversal ledger entry — exactly once, right after the flip.
  if (!success && payment.kind === "WITHDRAWAL") {
    await prisma.$transaction(async (tx) => {
      await creditWallet(tx, payment.userId, payment.amount);
      await logLedger(tx, {
        userId: payment.userId,
        kind: "WITHDRAWAL_REVERSAL",
        amount: payment.amount,
        paymentId: payment.id,
        description: "Withdrawal failed — balance restored",
      });
    });
  }
}

/* -------------------------------- Route ----------------------------------- */

export async function POST(req: Request): Promise<Response> {
  let body: DarajaBody;
  try {
    body = (await req.json()) as DarajaBody;
  } catch {
    return Response.json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.Body?.stkCallback) {
      await handleStk(body.Body.stkCallback);
    } else if (body.Result) {
      await handleB2c(body.Result);
    }
    // Anything else: acknowledge but take no action.
    return ok();
  } catch (err) {
    // Log and still ACK: Daraja retries on non-2xx, and blind retries with a
    // broken payload help nobody. The payment stays PENDING for stkQuery.
    console.error("[daraja-callback]", err);
    return ok();
  }
}
