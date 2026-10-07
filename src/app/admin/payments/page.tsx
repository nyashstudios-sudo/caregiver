import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/format";
import { getPlatformFeePct, getWhtRatePct } from "@/lib/settings";
import { updatePlatformFeeAction, updateWhtRateAction } from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: "Payments (admin)",
  robots: { index: false },
};

const KIND_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit",
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
      ["DEPOSIT", "BOOKING_PAYMENT", "WITHDRAWAL", "REFUND"].includes(kind)
        ? { kind: kind as "DEPOSIT" | "BOOKING_PAYMENT" | "WITHDRAWAL" | "REFUND" }
        : {},
    ],
  };

  const [payments, totals, grouped, walletAgg, feePct, feeEarned, escrowHeld, whtPct, taxHeld, deposited] =
    await Promise.all([
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
      getPlatformFeePct(),
      prisma.booking.aggregate({
        where: { releasedAt: { not: null } },
        _sum: { feeAmount: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: { paidAt: { not: null }, releasedAt: null, refundedAt: null },
        _sum: { amount: true },
      }),
      getWhtRatePct(),
      prisma.taxWithholding.aggregate({
        _sum: { whtAmount: true, gross: true, fee: true, net: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { kind: "DEPOSIT", status: "SUCCESS" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

  const sumOf = (k: string, s: string) =>
    grouped.find((g) => g.kind === k && g.status === s)?._sum.amount ?? 0;
  const countOf = (k: string, s: string) =>
    grouped.find((g) => g.kind === k && g.status === s)?._count ?? 0;

  return (
    <div>
      {/* ── Monetization: commission rate + revenue ───────────────── */}
      <section className="mb-6 card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Monetization</h2>
            <p className="text-sm text-muted">
              Platform commission charged on worker earnings when escrow releases.
              Applies to every future release; the env var is only a fallback.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-xl bg-brand-soft px-4 py-2 text-center">
              <p className="text-lg font-extrabold text-brand-on-soft">
                {formatKES(feeEarned._sum.feeAmount ?? 0)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide">
                Commission earned · {feeEarned._count} releases
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-center dark:bg-slate-800">
              <p className="text-lg font-extrabold text-ink">
                {formatKES(escrowHeld._sum.amount ?? 0)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                In escrow (unreleased)
              </p>
            </div>
          </div>
        </div>

        <form action={updatePlatformFeeAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="feePct">
              Commission rate (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="feePct"
                name="feePct"
                type="number"
                min={0}
                max={50}
                step={0.5}
                defaultValue={feePct}
                className="input w-28"
              />
              <span className="text-sm font-semibold text-muted">%</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Save rate
          </button>
          <span className="text-xs text-muted">
            Currently <strong className="text-ink">{feePct}%</strong> — e.g. KES 1,000 release
            pays the worker KES {Math.round(1000 * (1 - feePct / 100)).toLocaleString("en-GB")}.
          </span>
        </form>
        {single(sp.feesaved) && (
          <p className="field-ok mt-3">✓ Commission rate updated and logged.</p>
        )}
        {single(sp.error) === "fee" && (
          <p className="field-error mt-3">Rate must be between 0 and 50 percent.</p>
        )}
      </section>

      {/* ── KRA withholding tax + deposits ──────────────────────── */}
      <section className="mb-6 card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">KRA withholding &amp; deposits</h2>
            <p className="text-sm text-muted">
              Tax withheld from worker earnings at release (ITA s.35) is held for remittance to
              KRA. Deposits are client funds that have landed in wallets via STK push.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-xl bg-amber-100 px-4 py-2 text-center dark:bg-amber-950">
              <p className="text-lg font-extrabold text-amber-800 dark:text-amber-200">
                {formatKES(taxHeld._sum.whtAmount ?? 0)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide">
                Tax withheld · {taxHeld._count} records (to remit)
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-center dark:bg-slate-800">
              <p className="text-lg font-extrabold text-ink">
                {formatKES(deposited._sum.amount ?? 0)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Client deposits · {deposited._count}
              </p>
            </div>
          </div>
        </div>

        <form action={updateWhtRateAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="whtPct">
              Withholding tax rate (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="whtPct"
                name="whtPct"
                type="number"
                min={0}
                max={30}
                step={0.5}
                defaultValue={whtPct}
                className="input w-28"
              />
              <span className="text-sm font-semibold text-muted">%</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Save WHT rate
          </button>
          <span className="text-xs text-muted">
            Currently <strong className="text-ink">{whtPct}%</strong> — e.g. KES 1,000 gross
            earnings release withholds KES {Math.round(1000 * whtPct) / 100} of tax. Snapshotted
            per job: changing it never rewrites past statements.
          </span>
        </form>
        {single(sp.whtsaved) && (
          <p className="field-ok mt-3">✓ Withholding-tax rate updated and logged.</p>
        )}
        {single(sp.error) === "wht" && (
          <p className="field-error mt-3">Rate must be between 0 and 30 percent.</p>
        )}
      </section>

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
