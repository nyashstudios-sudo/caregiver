import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { MessageComposer } from "@/components/MessageComposer";
import { markThreadReadAction } from "@/lib/actions/messages";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false },
};

function bubbleTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(date: Date): string {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await requireSession(`/messages/${userId}`);
  if (userId === user.id) notFound();

  const peer = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      profile: { select: { id: true, fullName: true, avatarUrl: true, location: true } },
    },
  });
  if (!peer) notFound();

  // Mark incoming messages as read on open.
  await markThreadReadAction(peer.id);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: peer.id },
        { senderId: peer.id, receiverId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const peerName = peer.profile?.fullName ?? "Caregiver user";

  // Render with day separators.
  const blocks: React.ReactNode[] = [];
  let lastDay = "";
  messages.forEach((msg) => {
    const day = dayLabel(msg.createdAt);
    if (day !== lastDay) {
      lastDay = day;
      blocks.push(
        <li key={`d-${day}`} className="my-4 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{day}</span>
          <span className="h-px flex-1 bg-line" />
        </li>
      );
    }
    const outgoing = msg.senderId === user.id;
    blocks.push(
      <li key={msg.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
        <div className={`bubble ${outgoing ? "bubble-out" : "bubble-in"}`}>
          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
          <p
            className={`mt-1 text-[10px] ${outgoing ? "text-white/70 dark:text-[#04231f]/70" : "text-muted"}`}
          >
            {bubbleTime(msg.createdAt)}
          </p>
        </div>
      </li>
    );
  });

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Thread header */}
      <div className="page-hero mb-4 flex items-center gap-3">
        <Link
          href="/messages"
          className="btn btn-secondary h-10 w-10 shrink-0 !px-0"
          aria-label="Back to inbox"
        >
          ←
        </Link>
        <Avatar src={peer.profile?.avatarUrl} name={peerName} size={44} />
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{peerName}</p>
          <p className="truncate text-xs text-muted">
            {peer.role === "WORKER" ? "Caretaker" : peer.role === "ADMIN" ? "Caregiver team" : "Client"}
            {peer.profile?.location ? ` · ${peer.profile.location}` : ""}
            {peer.status === "SUSPENDED" ? " · suspended" : ""}
          </p>
        </div>
        {peer.role === "WORKER" && peer.profile && (
          <Link
            href={`/caretakers/${peer.profile.id}`}
            className="btn btn-secondary ml-auto hidden sm:inline-flex"
          >
            View profile
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="card mb-4 flex min-h-[50vh] flex-col p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="m-auto py-10 text-center">
            <p className="font-bold text-ink">Start the conversation</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Send {peerName.split(" ")[0]} a message about availability, rates or a booking
              request.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">{blocks}</ul>
        )}
      </div>

      {/* Composer */}
      <MessageComposer receiverId={peer.id} receiverName={peerName} />

      <p className="mt-3 text-center text-xs text-muted">
        Messages stay on the platform — never share M-Pesa PINs or passwords here.
      </p>
    </div>
  );
}
