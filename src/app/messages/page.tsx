import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Avatar } from "@/components/Avatar";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false },
};

function previewTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function MessagesInboxPage() {
  const user = await requireSession("/messages");

  const thread = await prisma.message.findMany({
    where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      sender: {
        select: {
          id: true,
          role: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      receiver: {
        select: {
          id: true,
          role: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  // Group by the person on the other side of each message.
  type Row = {
    peerId: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    lastBody: string;
    lastAt: Date;
    unread: number;
    outgoing: boolean;
  };
  const rows = new Map<string, Row>();

  for (const msg of thread) {
    const outgoing = msg.senderId === user.id;
    const peer = outgoing ? msg.receiver : msg.sender;
    const existing = rows.get(peer.id);
    const unreadIncoming = !outgoing && !msg.readAt ? 1 : 0;

    if (existing) {
      // Messages are newest-first, so only the first hit is the latest.
      existing.unread += unreadIncoming;
      continue;
    }
    rows.set(peer.id, {
      peerId: peer.id,
      name: peer.profile?.fullName ?? "Caregiver user",
      avatarUrl: peer.profile?.avatarUrl ?? null,
      role: peer.role,
      lastBody: msg.body,
      lastAt: msg.createdAt,
      unread: unreadIncoming,
      outgoing,
    });
  }

  // Fold unread counts that belong to older messages in the same thread.
  for (const msg of thread) {
    if (msg.readAt || msg.senderId === user.id) continue;
    const row = rows.get(msg.senderId);
    if (row && msg.createdAt.getTime() !== row.lastAt.getTime()) row.unread += 1;
  }

  const conversations = [...rows.values()].sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime()
  );
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Messages
          </h1>
          <p className="mt-1 text-muted">
            Talk to caretakers, clients and the Caregiver team — {unreadTotal} unread.
          </p>
        </div>
        <Link href="/caretakers" className="btn btn-primary">
          Find someone to message
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-bold text-ink">No conversations yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Open a caretaker&apos;s profile and tap <strong>Message</strong> to start a
            conversation — or reply to a booking from your dashboard.
          </p>
          <Link href="/caretakers" className="btn btn-primary mt-4">
            Browse caretakers
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {conversations.map((c) => (
            <li key={c.peerId}>
              <Link
                href={`/messages/${c.peerId}`}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2/60"
              >
                <Avatar src={c.avatarUrl} name={c.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-bold text-ink">{c.name}</p>
                    <span className="shrink-0 text-xs text-muted">{previewTime(c.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${c.unread ? "font-semibold text-ink" : "text-muted"}`}>
                      {c.outgoing && <span className="text-muted">You: </span>}
                      {c.lastBody}
                    </p>
                    {c.unread > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white dark:text-[#04231f]">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
