import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/Badges";
import { formatKESRate } from "@/lib/format";
import { adminCancelBookingAction } from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: "Booking monitor (admin)",
  robots: { index: false },
};

const STATUSES = ["ALL", "PENDING", "ACCEPTED", "COMPLETED", "CANCELLED"] as const;

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = single(sp.status);
  const q = single(sp.q).trim().toLowerCase();

  const where =
    STATUSES.includes(status as (typeof STATUSES)[number]) && status !== "ALL"
      ? { status: status as "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" }
      : {};

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      client: {
        include: { profile: { select: { fullName: true } } },
      },
      worker: {
        include: {
          profile: {
            select: {
              fullName: true,
              caretakerDetails: { select: { hourlyRate: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const filtered = q
    ? bookings.filter(
        (b) =>
          (b.client.profile?.fullName ?? b.client.email).toLowerCase().includes(q) ||
          (b.worker.profile?.fullName ?? b.worker.email).toLowerCase().includes(q) ||
          (b.notes ?? "").toLowerCase().includes(q)
      )
    : bookings;

  const all = await prisma.booking.groupBy({ by: ["status"], _count: true });
  const countOf = (s: string) => all.find((x) => x.status === s)?._count ?? 0;

  const completedRevenue = await prisma.booking.findMany({
    where: { status: "COMPLETED" },
    include: {
      worker: {
        include: {
          profile: { select: { caretakerDetails: { select: { hourlyRate: true } } } },
        },
      },
    },
  });
  const estimatedValue = completedRevenue.reduce(
    (sum, b) => sum + (b.worker.profile?.caretakerDetails?.hourlyRate ?? 0) * 4, // assume ~4h job
    0
  );

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Pending</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">{countOf("PENDING")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Accepted</p>
          <p className="mt-1 text-2xl font-extrabold text-brand">{countOf("ACCEPTED")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Completed</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{countOf("COMPLETED")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Cancelled</p>
          <p className="mt-1 text-2xl font-extrabold text-red-500">{countOf("CANCELLED")}</p>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Est. completed value</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">KES {estimatedValue.toLocaleString()}</p>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/bookings" method="get">
        <input name="q" defaultValue={single(sp.q)} placeholder="Search client, worker or notes…" className="input max-w-xs flex-1" />
        <select name="status" defaultValue={status || "ALL"} className="input w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">Filter</button>
        {(q || status) && <Link href="/admin/bookings" className="btn btn-secondary">Clear</Link>}
      </form>

      {single(sp.cancelled) && <p className="field-ok mb-4">✓ Booking cancelled.</p>}

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">No bookings match these filters.</div>
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Worker</th>
                <th>When</th>
                <th>Rate</th>
                <th>Notes</th>
                <th>Status</th>
                <th className="text-right">Supervise</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="font-semibold">
                    {b.client.profile?.fullName ?? b.client.email}
                    <span className="block text-xs font-normal text-muted">{b.client.email}</span>
                  </td>
                  <td className="font-semibold">
                    {b.worker.profile?.fullName ?? b.worker.email}
                    <span className="block text-xs font-normal text-muted">
                      {b.worker.profile?.caretakerDetails
                        ? formatKESRate(b.worker.profile.caretakerDetails.hourlyRate)
                        : "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {b.serviceDate.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="text-sm text-muted">
                    {b.worker.profile?.caretakerDetails
                      ? formatKESRate(b.worker.profile.caretakerDetails.hourlyRate)
                      : "—"}
                  </td>
                  <td className="max-w-[16rem] text-sm text-muted">
                    <span className="line-clamp-2">{b.notes || "—"}</span>
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <div className="flex justify-end">
                      {(b.status === "PENDING" || b.status === "ACCEPTED") && (
                        <form action={adminCancelBookingAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className="btn btn-danger !px-3 !py-1.5 text-xs">
                            Force cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Showing {filtered.length} of up to 200 bookings. Force-cancel immediately ends an open
        booking for both parties.
      </p>
    </div>
  );
}
