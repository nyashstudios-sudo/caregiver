import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatKES } from "@/lib/format";
import { WithdrawForm, DepositForm } from "@/components/PayButtons";

export const metadata: Metadata = {
  title: "Wallet",
  robots: { index: false },
};

const KIND_LABEL: Record<string, string> = {
  DEPOSIT: "M-Pesa deposit",
  BOOKING_PAYMENT: "Booking payment",
  WITHDRAWAL: "M-Pesa withdrawal",
  REFUND: "Refund",
};

const LEDGER_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit",
  BOOKING_PAYMENT: "Paid booking (escrow)",
  REFUND: "Refund",
  RELEASE: "Earnings release",
  WITHDRAWAL: "Withdrawal",
  WITHDRAWAL_REVERSAL: "Withdrawal reversed",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  SUCCESS: "badge-green",
  FAILED: "badge-red",
};

export default async function WalletPage() {
  const user = await requireSession("/wallet");

  const [wallet, payments, record, ledger, tax] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { booking: { select: { serviceDate: true, amount: true } } },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, profile: { select: { kraPin: true } } },
    }),
    prisma.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    user.role === "WORKER"
      ? prisma.taxWithholding.aggregate({
          where: { workerId: user.id },
          _sum: { gross: true, fee: true, whtAmount: true, net: true },
          _count: true,
        })
      : null,
  ]);

  const balance = wallet?.balance ?? 0;
  const isWorker = user.role === "WORKER";

  const incoming = payments
    .filter((p) => p.kind === "BOOKING_PAYMENT" && p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);
  const deposited = payments
    .filter((p) => p.kind === "DEPOSIT" && p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);
  const withdrawn = payments
    .filter((p) => p.kind === "WITHDRAWAL" && p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);

  const taxGross = tax?._sum.gross ?? 0;
  const taxFee = tax?._sum.fee ?? 0;
  const taxHeld = tax?._sum.whtAmount ?? 0;
  const taxNet = tax?._sum.net ?? 0;

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <p className="eyebrow">Money</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          My wallet
        </h1>
        <p className="mt-1 text-muted">
          Deposit once, pay for jobs and services from your balance, and withdraw to M-Pesa
          anytime — every movement is recorded in your ledger.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Balance hero */}
          <div className="page-hero-navy">
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
                Available balance
              </p>
              <p className="mt-2 text-4xl font-extrabold sm:text-5xl">{formatKES(balance)}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/75">
                <span>📥 Deposited: {formatKES(deposited)}</span>
                <span>⬇️ Received: {formatKES(incoming)}</span>
                <span>⬆️ Withdrawn: {formatKES(withdrawn)}</span>
              </div>
            </div>
          </div>

          {/* Worker earnings & KRA tax summary */}
          {isWorker && tax && (
            <section className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-ink">Earnings &amp; tax</h2>
                <Link href="/wallet/tax" className="btn btn-secondary !px-3 !py-1.5 text-xs">
                  Full tax statement
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Gross earned
                  </p>
                  <p className="mt-1 font-extrabold text-ink">{formatKES(taxGross)}</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Platform fee
                  </p>
                  <p className="mt-1 font-extrabold text-ink">{formatKES(taxFee)}</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    KRA tax withheld
                  </p>
                  <p className="mt-1 font-extrabold text-ink">{formatKES(taxHeld)}</p>
                </div>
                <div className="rounded-xl bg-brand-soft p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-on-soft">
                    You received
                  </p>
                  <p className="mt-1 font-extrabold text-brand-on-soft">{formatKES(taxNet)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">
                {tax._count} paid job{tax._count === 1 ? "" : "s"} recorded. Withholding tax is
                deducted at source and remitted by Caregiver — you claim it back as a credit when
                you file your KRA return.{" "}
                {record?.profile?.kraPin
                  ? `Statements carry PIN ${record.profile.kraPin}.`
                  : "Add your KRA PIN on the statement page."}
              </p>
            </section>
          )}

          {/* Wallet activity ledger */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-ink">Wallet activity</h2>
            {ledger.length === 0 ? (
              <div className="card p-8 text-center text-muted">
                No wallet movements yet — deposit funds or complete a job and every credit or
                debit will be listed here with the resulting balance.
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Movement</th>
                      <th>Amount</th>
                      <th>Balance after</th>
                      <th>Note</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-semibold">
                          {LEDGER_LABEL[entry.kind] ?? entry.kind}
                        </td>
                        <td
                          className={`font-bold ${entry.amount >= 0 ? "text-brand" : "text-ink"}`}
                        >
                          {entry.amount >= 0 ? "+" : "−"}
                          {formatKES(Math.abs(entry.amount))}
                        </td>
                        <td className="text-sm text-muted">{formatKES(entry.balanceAfter)}</td>
                        <td className="max-w-[16rem] text-xs text-muted">{entry.description}</td>
                        <td className="whitespace-nowrap text-sm text-muted">
                          {entry.createdAt.toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* M-Pesa rail transactions */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-ink">M-Pesa transactions</h2>
            {payments.length === 0 ? (
              <div className="card p-8 text-center text-muted">
                No M-Pesa transactions yet. Deposit funds, pay a booking or withdraw and it will
                appear here.
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Reference</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">
                          {KIND_LABEL[p.kind] ?? p.kind}
                          {p.booking && (
                            <span className="block text-xs font-normal text-muted">
                              job{" "}
                              {p.booking.serviceDate.toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                            </span>
                          )}
                        </td>
                        <td className="font-bold">{formatKES(p.amount)}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                          {p.failureReason && (
                            <span className="mt-1 block max-w-[12rem] text-xs text-red-500">
                              {p.failureReason}
                            </span>
                          )}
                        </td>
                        <td className="font-mono text-xs text-muted">
                          {p.mpesaReceipt ||
                            (p.conversationId === "WALLET"
                              ? "wallet"
                              : p.checkoutRequestId?.slice(0, 12)) ||
                            "—"}
                        </td>
                        <td className="whitespace-nowrap text-sm text-muted">
                          {p.createdAt.toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Actions sidebar */}
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-1 text-lg font-bold text-ink">Deposit with M-Pesa</h2>
            <p className="mb-4 text-sm text-muted">
              Top up your balance once, then pay for bookings and services instantly — no prompts
              at checkout. KES 100 – 70,000 per top-up.
            </p>
            <DepositForm defaultPhone={record?.phone ?? ""} />
          </div>

          <div className="card p-5">
            <h2 className="mb-1 text-lg font-bold text-ink">Withdraw to M-Pesa</h2>
            <p className="mb-4 text-sm text-muted">
              Transfers usually land within a minute. KES 100 – 70,000 per request.
            </p>
            <WithdrawForm balance={balance} defaultPhone={record?.phone ?? ""} />
          </div>

          <div className="card p-5 text-sm text-muted">
            <p className="mb-2 font-bold text-ink">How money moves</p>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>Deposit to your wallet, or pay a booking straight by M-Pesa STK.</li>
              <li>Booking funds sit in escrow until the job is completed.</li>
              <li>
                On completion, earnings (minus platform fee and, for workers, KRA withholding
                tax) hit the wallet.
              </li>
              <li>Withdraw anytime — straight to your registered Safaricom number.</li>
            </ol>
            <p className="mt-3 text-xs">
              Payments are processed by Safaricom Daraja. Caregiver never stores your M-Pesa PIN.
            </p>
          </div>

          <Link href="/account" className="btn btn-secondary w-full">
            Update account phone
          </Link>
        </aside>
      </div>
    </div>
  );
}
