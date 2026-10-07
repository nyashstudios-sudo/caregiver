/**
 * Web Push sender — PWA alerts for direct messages, booking changes and
 * payouts. Best-effort by design: a failed endpoint is pruned, a missing
 * VAPID config is a silent no-op, and no caller ever waits on the network.
 */

import webpush from "web-push";
import { prisma } from "./prisma";

let ready = false;

function configured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@caregiver.co.ke";
  if (!publicKey || !privateKey) return false;
  if (!ready) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    ready = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configured()) return;

  let subs: { id: string; endpoint: string; p256dh: string; auth: string }[];
  try {
    subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch {
    return;
  }
  if (subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 2 * 24 * 3600 }
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // The subscription is dead (browser rotated it) — drop it.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
    })
  );
}
