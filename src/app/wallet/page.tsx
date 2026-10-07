import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatKES } from "@/lib/format";
import { WithdrawForm } from "@/components/PayButtons";

export const metadata: Metadata = {
  title: "Wallet",
  robots: { index: false },
};

const KIND_LABEL: Record<string, string> = {
  BOOKING_PAYMENT: "Booking payment",
  WITHDRAWAL: "M-Pesa withdrawal",
  REFUND: "Refund",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  SUCCESS: "badge-green",
  FAILED: "badge-red",
};

export default async function WalletPage() {
  const user = await requireSession("/wallet");

  const [wallet, payments] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { booking: { select: { serviceDate: true, amount: true } } },
    }),
  ]);

  const balance = wallet?.balance ?? 0;
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true },
  });

  const incoming = payments
    .filter((p) => p.kind === "BOOKING_PAYMENT" && p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);
  const withdrawn = payments
    .filter((p) => p.kind === "WITHDRAWAL" && p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <p className="eyebrow">Money</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          My wallet
        </h1>
        <p className="mt-1 text-muted">
          Earnings, refunds and payments held securely on the platform — withdraw to M-Pesa anytime.
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
                <span>⬇️ Received: {formatKES(incoming)}</span>
                <span>⬆️ Withdrawn: {formatKES(withdrawn)}</span>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-ink">Transactions</h2>
            {payments.length === 0 ? (
              <div className="card p-8 text-center text-muted">
                No M-Pesa transactions yet. Pay a booking or complete a job and it will appear
                here.
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
                              job {p.booking.serviceDate.toLocaleDateString("en-GB", {
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
                          {p.mpesaReceipt || p.checkoutRequestId?.slice(0, 12) || "—"}
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

        {/* Withdraw sidebar */}
        <aside className="space-y-4">
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
              <li>Client pays a booking via M-Pesa STK prompt (escrow).</li>
              <li>On job completion, earnings (minus platform fee) hit your wallet.</li>
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
