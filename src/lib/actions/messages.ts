"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireSession } from "@/lib/session";
import { notifyUser } from "@/lib/notify";

export type MessageState = { error?: string; ok?: boolean } | null;

const MAX_LEN = 2000;

/**
 * Send an in-app message to another user (any role). Used from caretaker
 * profiles, booking cards and the /messages composer.
 */
export async function sendMessageAction(
  _prev: MessageState,
  formData: FormData
): Promise<MessageState> {
  const user = await requireSession("/messages");

  const receiverId = String(formData.get("receiverId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const next = String(formData.get("next") ?? "");

  if (!receiverId) return { error: "Recipient not found" };
  if (receiverId === user.id) return { error: "You cannot message yourself" };
  if (!body) return { error: "Write a message first" };
  if (body.length > MAX_LEN) return { error: `Messages are capped at ${MAX_LEN} characters` };

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, status: true },
  });
  if (!receiver) return { error: "Recipient not found" };
  if (receiver.status === "SUSPENDED") {
    return { error: "This account is suspended and cannot receive messages" };
  }

  await prisma.message.create({
    data: { senderId: user.id, receiverId, body },
  });

  // PWA push — best-effort alert on the receiver's installed app.
  await notifyUser(receiverId, {
    title: user.name ? `New message from ${user.name}` : "New message",
    body: body.slice(0, 140),
    url: `/messages/${user.id}`,
    tag: `dm-${user.id}`,
  }).catch(() => undefined);

  revalidatePath("/messages");
  revalidatePath(`/messages/${receiverId}`);
  if (next) revalidatePath(next);

  // Plain form posts (no useActionState) redirect to the thread.
  if (!(formData.get("_stateful") === "1")) {
    redirect(`/messages/${receiverId}`);
  }
  return { ok: true };
}

/**
 * Mark every message the current user received from `peerId` as read.
 * Called during thread render, so it only writes — no revalidatePath here
 * (not allowed mid-render); the inbox re-reads on next navigation.
 */
export async function markThreadReadAction(peerId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  await prisma.message.updateMany({
    where: { senderId: peerId, receiverId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
