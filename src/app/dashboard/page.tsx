import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/Badges";
import { updateBookingAction } from "@/lib/actions/bookings";

export const metadata: Metadata = {
  title: "Bookings dashboard",
};

function formatDate(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="card flex-1 p-4 text-center sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold sm:text-4xl ${tone}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const sp = await searchParams;

  const where =
    user.role === "CLIENT"
      ? { clientId: user.id }
      : user.role === "WORKER"
        ? { workerId: user.id }
        : {}; // admins see everything

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      client: { include: { profile: true } },
      worker: { include: { profile: true } },
    },
    orderBy: { serviceDate: "desc" },
  });

  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const accepted = bookings.filter((b) => b.status === "ACCEPTED").length;
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;

  const isClientView = user.role === "CLIENT";
  const title = isClientView
    ? "My bookings"
    : user.role === "WORKER"
      ? "My dashboard"
      : "All bookings (admin)";

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{user.name ? `Karibu, ${user.name.split(" ")[0]}` : "Dashboard"}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-muted">
            {isClientView
              ? "Track the caretakers you have requested and their statuses."
              : "Accept, complete and cancel the requests sent to you."}
          </p>
        </div>
        {isClientView ? (
          <Link href="/caretakers" className="btn btn-primary">
            Find caretakers
          </Link>
        ) : user.role === "WORKER" ? (
          <Link href="/worker" className="btn btn-primary">
            Edit my portal
          </Link>
        ) : null}
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-row gap-3 sm:gap-4">
        <StatCard label="Pending" value={pending} tone="text-amber-600 dark:text-amber-400" />
        <StatCard label="Accepted" value={accepted} tone="text-brand" />
        <StatCard label="Completed" value={completed} tone="text-ink" />
      </div>

      {single(sp.booked) && (
        <p className="field-ok mb-4">
          ✓ Booking request sent — it is waiting for the caretaker to accept.
        </p>
      )}
      {single(sp.updated) && <p className="field-ok mb-4">✓ Booking status updated.</p>}
      {single(sp.error) && (
        <p className="field-error mb-4">Could not update that booking. Please try again.</p>
      )}

      <h2 className="mb-3 text-lg font-bold text-ink">
        {isClientView ? "Upcoming & recent bookings" : "Booking requests"}
      </h2>

      {bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-bold text-ink">No bookings yet</p>
          <p className="mt-1 text-sm text-muted">
            {isClientView
              ? "Browse the directory and send your first booking request."
              : "When clients book you, their requests will appear here."}
          </p>
          {isClientView && (
            <Link href="/caretakers" className="btn btn-primary mt-4">
              Browse caretakers
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => {
            const counterpart = isClientView ? booking.worker : booking.client;
            const name = counterpart.profile?.fullName ?? counterpart.email;
            const canManage = user.role === "WORKER" || user.role === "ADMIN";
            const canCancel =
              (isClientView || canManage) &&
              (booking.status === "PENDING" || booking.status === "ACCEPTED");

            return (
              <li key={booking.id} className="card p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar
                      src={counterpart.profile?.avatarUrl}
                      name={counterpart.profile?.fullName ?? counterpart.email}
                      size={44}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink">{name}</p>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm text-muted">
                        {counterpart.profile?.location ?? "—"} ·{" "}
                        {isClientView ? "caretaker" : "client"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink">
                        📅 {formatDate(booking.serviceDate)}
                      </p>
                      {booking.notes && (
                        <p className="mt-1 text-sm text-muted">“{booking.notes}”</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canManage && booking.status === "PENDING" && (
                      <form action={updateBookingAction}>
                        <input type="hidden" name="id" value={booking.id} />
                        <input type="hidden" name="intent" value="accept" />
                        <button type="submit" className="btn btn-primary">
                          Accept
                        </button>
                      </form>
                    )}
                    {canManage && booking.status === "ACCEPTED" && (
                      <form action={updateBookingAction}>
                        <input type="hidden" name="id" value={booking.id} />
                        <input type="hidden" name="intent" value="complete" />
                        <button type="submit" className="btn btn-primary">
                          Mark completed
                        </button>
                      </form>
                    )}
                    {canCancel && (
                      <form action={updateBookingAction}>
                        <input type="hidden" name="id" value={booking.id} />
                        <input type="hidden" name="intent" value="cancel" />
                        <button type="submit" className="btn btn-danger">
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
