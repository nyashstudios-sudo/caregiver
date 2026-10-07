import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/Badges";

export const metadata: Metadata = {
  title: "Admin overview",
  robots: { index: false },
};

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className="text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="card block p-5 transition hover:border-brand">
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
}

export default async function AdminOverviewPage() {
  const [
    clients,
    workers,
    pendingBookings,
    publishedPosts,
    draftPosts,
    messages,
    openMessages,
    suspended,
    newUsers7d,
    unreadThreads,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "WORKER", status: "ACTIVE" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    prisma.blogPost.count({ where: { status: "DRAFT" } }),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { handledAt: null } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
    prisma.message.count({ where: { readAt: null } }),
  ]);

  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      client: { include: { profile: true } },
      worker: { include: { profile: true } },
    },
  });

  const recentMessages = await prisma.contactMessage.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Active clients" value={clients} href="/admin/users?role=CLIENT" />
          <Stat label="Active workers" value={workers} href="/admin/users?role=WORKER" />
          <Stat label="Pending bookings" value={pendingBookings} href="/admin/bookings?status=PENDING" />
          <Stat label="New users (7d)" value={newUsers7d} href="/admin/users" />
          <Stat label="Open contact msgs" value={openMessages} href="/admin/messages" />
          <Stat label="Unread DMs" value={unreadThreads} href="/messages" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Published posts" value={publishedPosts} href="/blog" />
          <Stat label="Drafts" value={draftPosts} href="/admin/posts" />
          <Stat label="Contact messages (all)" value={messages} href="/admin/messages" />
          <Stat label="Suspended users" value={suspended} href="/admin/users?status=SUSPENDED" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Latest bookings</h2>
          <Link href="/admin/bookings" className="text-sm font-semibold text-brand hover:underline">
            Monitor all →
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <p className="card p-5 text-sm text-muted">No bookings yet.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {recentBookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {booking.client.profile?.fullName ?? booking.client.email} →{" "}
                    {booking.worker.profile?.fullName ?? booking.worker.email}
                  </p>
                  <p className="text-xs text-muted">
                    {booking.serviceDate.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Latest messages</h2>
          <Link href="/admin/messages" className="text-sm font-semibold text-brand hover:underline">
            View all →
          </Link>
        </div>
        {recentMessages.length === 0 ? (
          <p className="card p-5 text-sm text-muted">No contact messages yet.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {recentMessages.map((message) => (
              <li key={message.id} className="px-4 py-3 text-sm">
                <p className="font-semibold text-ink">
                  {message.name}{" "}
                  <span className="font-normal text-muted">· {message.email}</span>
                </p>
                <p className="text-xs text-muted">
                  {message.subject || "No subject"} ·{" "}
                  {message.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 line-clamp-2 text-muted">{message.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
