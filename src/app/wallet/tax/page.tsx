import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatKES } from "@/lib/format";
import { getWhtRatePct } from "@/lib/settings";
import { TaxProfileForm } from "@/components/TaxProfileForm";

export const metadata: Metadata = {
  title: "Tax statement",
  robots: { index: false },
};

function yearsFromPeriods(periods: string[]): string[] {
  const years = [...new Set(periods.map((p) => p.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  return years.length ? years : [String(new Date().getFullYear())];
}

export default async function TaxStatementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession("/wallet/tax");
  if (user.role !== "WORKER") redirect("/wallet");

  const sp = await searchParams;
  const requested = Array.isArray(sp.year) ? sp.year[0] : sp.year;

  const [periods, profile, ratePct] = await Promise.all([
    prisma.taxWithholding.groupBy({
      by: ["period"],
      where: { workerId: user.id },
    }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { kraPin: true, fullName: true },
    }),
    getWhtRatePct(),
  ]);

  const years = yearsFromPeriods(periods.map((p) => p.period));
  const year = requested && years.includes(requested) ? requested : years[0];
  const prefix = `${year}-`;

  const [rows, agg] = await Promise.all([
    prisma.taxWithholding.findMany({
      where: { workerId: user.id, period: { startsWith: prefix } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.taxWithholding.aggregate({
      where: { workerId: user.id, period: { startsWith: prefix } },
      _sum: { gross: true, fee: true, whtAmount: true, net: true },
      _count: true,
    }),
  ]);

  const gross = agg._sum.gross ?? 0;
  const fee = agg._sum.fee ?? 0;
  const wht = agg._sum.whtAmount ?? 0;
  const net = agg._sum.net ?? 0;

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Money · KRA records</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Withholding tax statement {year}
          </h1>
          <p className="mt-1 text-muted">
            Every job Caregiver paid you on {year}, with the tax deducted at source on your behalf.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/wallet/tax?year=${y}`}
              className={`btn !px-3 !py-1.5 text-sm ${
                y === year ? "btn-primary" : "btn-secondary"
              }`}
            >
              {y}
            </Link>
          ))}
          <a
            href={`/api/tax/statement?year=${year}`}
            className="btn btn-secondary !px-3 !py-1.5 text-sm"
            download
          >
            ⬇ CSV
          </a>
        </div>
      </div>

      {/* Year summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Gross earnings {year}
          </p>
          <p className="mt-1 text-xl font-extrabold text-ink">{formatKES(gross)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Platform fees withheld
          </p>
          <p className="mt-1 text-xl font-extrabold text-ink">{formatKES(fee)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            KRA tax withheld &amp; remitted
          </p>
          <p className="mt-1 text-xl font-extrabold text-ink">{formatKES(wht)}</p>
        </div>
        <div className="card p-4 bg-brand-soft border-brand/20">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-on-soft">
            You received
          </p>
          <p className="mt-1 text-xl font-extrabold text-brand-on-soft">{formatKES(net)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Records */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Withheld per job</h2>
          {rows.length === 0 ? (
            <div className="card p-8 text-center text-muted">
              No paid jobs recorded for {year} — withheld tax appears here the moment a booking
              is released to you.
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Gross</th>
                    <th>Fee</th>
                    <th>Rate</th>
                    <th>Tax withheld</th>
                    <th>Net paid</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap font-semibold">
                        {r.period}
                        <span className="block font-mono text-[10px] font-normal text-muted">
                          {r.bookingId ? `job …${r.bookingId.slice(-8)}` : "—"}
                        </span>
                      </td>
                      <td>{formatKES(r.gross)}</td>
                      <td className="text-muted">{formatKES(r.fee)}</td>
                      <td className="text-muted">{r.whtRate}%</td>
                      <td className="font-bold">{formatKES(r.whtAmount)}</td>
                      <td className="font-bold text-brand">{formatKES(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Side: PIN + compliance */}
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold text-ink">Tax profile</h2>
            <TaxProfileForm kraPin={profile?.kraPin ?? null} />
            <p className="mt-3 text-xs text-muted">
              Your PIN is printed on this statement and used for Caregiver&apos;s withholding-tax
              records. Current withholding rate:{" "}
              <strong className="text-ink">{ratePct}%</strong>.
            </p>
          </div>

          <div className="card p-5 text-sm text-muted">
            <p className="mb-2 font-bold text-ink">Your tax responsibilities</p>
            <ul className="list-disc space-y-2 pl-4">
              <li>
                Caregiver withholds tax at source on your earnings as the payer, remits it to KRA,
                and records it here — you do not pay it twice.
              </li>
              <li>
                You remain responsible for filing your own KRA income tax return (ITR for
                individuals) and reporting <strong className="text-ink">all</strong> income you
                earn on and off the platform.
              </li>
              <li>
                Withheld amounts show up as a credit against the tax you owe — keep this
                statement (or the CSV) with your records.
              </li>
              <li>
                Figures are platform records, not tax advice — confirm treatment with KRA or a
                licensed tax adviser for your situation.
              </li>
            </ul>
          </div>

          <Link href="/wallet" className="btn btn-secondary w-full">
            ← Back to wallet
          </Link>
        </aside>
      </div>
    </div>
  );
}
