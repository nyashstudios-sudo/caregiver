import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/format";

export const metadata: Metadata = {
  title: "Payments (admin)",
  robots: { index: false },
};

const KIND_LABEL: Record<string, string> = {
  BOOKING_PAYMENT: "Booking payment",
  WITHDRAWAL: "Withdrawal",
  REFUND: "Refund",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  SUCCESS: "badge-green",
  FAILED: "badge-red",
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = single(sp.status);
  const kind = single(sp.kind);

  const where = {
    AND: [
      ["PENDING", "SUCCESS", "FAILED"].includes(status)
        ? { status: status as "PENDING" | "SUCCESS" | "FAILED" }
        : {},
      ["BOOKING_PAYMENT", "WITHDRAWAL", "REFUND"].includes(kind)
        ? { kind: kind as "BOOKING_PAYMENT" | "WITHDRAWAL" | "REFUND" }
        : {},
    ],
  };

  const [payments, totals, grouped, walletAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { include: { profile: { select: { fullName: true } } } },
        booking: { select: { serviceDate: true, amount: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.groupBy({ by: ["kind", "status"], _sum: { amount: true }, _count: true }),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
  ]);

  const sumOf = (k: string, s: string) =>
    grouped.find((g) => g.kind === k && g.status === s)?._sum.amount ?? 0;
  const countOf = (k: string, s: string) =>
    grouped.find((g) => g.kind === k && g.status === s)?._count ?? 0;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Collected (escrow)</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {formatKES(sumOf("BOOKING_PAYMENT", "SUCCESS"))}
          </p>
          <p className="text-xs text-muted">{countOf("BOOKING_PAYMENT", "SUCCESS")} payments</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Withdrawn (B2C)</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {formatKES(sumOf("WITHDRAWAL", "SUCCESS"))}
          </p>
          <p className="text-xs text-muted">{countOf("WITHDRAWAL", "SUCCESS")} transfers</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Refunded</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {formatKES(sumOf("REFUND", "SUCCESS"))}
          </p>
          <p className="text-xs text-muted">{countOf("REFUND", "SUCCESS")} refunds</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">User wallet liability</p>
          <p className="mt-1 text-2xl font-extrabold text-brand">
            {formatKES(walletAgg._sum.balance ?? 0)}
          </p>
          <p className="text-xs text-muted">total owed to users</p>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/payments" method="get">
        <select name="kind" defaultValue={kind || "ALL"} className="input w-auto">
          <option value="ALL">All types</option>
          <option value="BOOKING_PAYMENT">Booking payments</option>
          <option value="WITHDRAWAL">Withdrawals</option>
          <option value="REFUND">Refunds</option>
        </select>
        <select name="status" defaultValue={status || "ALL"} className="input w-auto">
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
        <button type="submit" className="btn btn-primary">Filter</button>
        {(kind || status) && <Link href="/admin/payments" className="btn btn-secondary">Clear</Link>}
        <span className="ml-auto text-xs text-muted">
          lifetime successful: {formatKES(totals._sum.amount ?? 0)} · {totals._count} txns
        </span>
      </form>

      {payments.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          No payments match these filters. Payments appear here the moment a client initiates an
          STK push or a user requests a withdrawal.
        </div>
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>M-Pesa ref</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="font-semibold">
                      {p.user.profile?.fullName ?? p.user.email}
                    </span>
                    <span className="block text-xs text-muted">{p.phone ?? p.user.email}</span>
                  </td>
                  <td className="text-sm">
                    {KIND_LABEL[p.kind] ?? p.kind}
                    {p.booking && (
                      <span className="block text-xs text-muted">
                        job {p.booking.serviceDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </td>
                  <td className="font-bold">{formatKES(p.amount)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                    {p.failureReason && (
                      <span className="mt-1 block max-w-[14rem] text-xs text-red-500">
                        {p.failureReason}
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-xs text-muted">
                    {p.mpesaReceipt || p.conversationId?.slice(0, 14) || "—"}
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
      <p className="mt-3 text-xs text-muted">
        Showing {payments.length} of up to 200 transactions. Callbacks settle payments
        idempotently — a payment can only flip PENDING → SUCCESS/FAILED once.
      </p>
    </div>
  );
}
