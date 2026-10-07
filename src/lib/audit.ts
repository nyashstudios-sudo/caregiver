/**
 * Append-only audit trail for privileged actions. Every moderation, payout,
 * verification and settings change routes through here so /admin/audit can
 * answer "who did what, when" without guessing.
 *
 * Logging must never break the action it records — failures are swallowed.
 */

import { prisma } from "./prisma";

export type AuditAction =
  | "user.suspend"
  | "user.restore"
  | "user.promote"
  | "user.demote"
  | "user.verify"
  | "user.unverify"
  | "user.delete"
  | "credential.approve"
  | "credential.reject"
  | "booking.cancel"
  | "booking.refund"
  | "payment.refund"
  | "post.publish"
  | "post.unpublish"
  | "post.delete"
  | "review.delete"
  | "contact.resolve"
  | "contact.delete"
  | "setting.update"
  | "service.remove";

export type AuditMeta = Record<string, string | number | boolean | null>;

export async function logAdminAction(
  actorId: string | null,
  action: AuditAction,
  target?: { type?: string; id?: string; meta?: AuditMeta }
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        meta: (target?.meta as object | undefined) ?? undefined,
      },
    });
  } catch {
    // The trail is best-effort; the privileged action itself must proceed.
  }
}
