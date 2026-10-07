"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";
import { getPlatformFeePct, getWhtRatePct, setSetting } from "@/lib/settings";

async function requireAdmin(): Promise<string> {
  const user = await requireSession("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user.id;
}

/**
 * Suspend or restore a user account. Suspended users cannot sign in or
 * send messages; their profiles are hidden from the public directory.
 */
export async function setUserStatusAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "ACTIVE" && status !== "SUSPENDED")) {
    redirect("/admin/users?error=badinput");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) redirect("/admin/users?error=notfound");

  // Never let an admin suspend their own lifeline.
  if (target.role === "ADMIN" && id !== actorId) redirect("/admin/users?error=admin");

  await prisma.user.update({ where: { id }, data: { status } });
  await logAdminAction(actorId, status === "SUSPENDED" ? "user.suspend" : "user.restore", {
    type: "user",
    id,
  });
  revalidatePath("/admin/users");
  redirect(`/admin/users?${status === "SUSPENDED" ? "suspended" : "restored"}=1`);
}

/**
 * Toggle the public "verified" badge a worker earns after admin vetting of
 * their identity and qualifications.
 */
export async function setUserVerifiedAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const verified = formData.get("verified") === "1";
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, profile: { select: { userId: true } } },
  });
  if (!target?.profile) redirect("/admin/verifications?error=notfound");

  await prisma.profile.update({
    where: { userId: id },
    data: { verifiedAt: verified ? new Date() : null },
  });
  await logAdminAction(actorId, verified ? "user.verify" : "user.unverify", {
    type: "user",
    id,
    meta: { role: target.role },
  });
  revalidatePath("/admin/verifications");
  revalidatePath("/admin/users");
  // The caller decides where to land (queue vs user list) — stay inside /admin.
  const next = String(formData.get("next") ?? "");
  redirect(
    next.startsWith("/admin")
      ? `${next}?verified=${verified ? "1" : "0"}`
      : `/admin/verifications?verified=${verified ? "1" : "0"}`
  );
}

/**
 * Vet an uploaded credential: approve it (worker earns the badge credit) or
 * reject it with a note the worker sees in their portal.
 */
export async function reviewCredentialAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  if (!id || (decision !== "APPROVED" && decision !== "REJECTED")) {
    redirect("/admin/verifications?error=badinput");
  }

  const cert = await prisma.certification.findUnique({ where: { id } });
  if (!cert) redirect("/admin/verifications?error=notfound");

  await prisma.certification.update({
    where: { id },
    data: {
      status: decision,
      reviewedAt: new Date(),
      reviewedBy: actorId,
      reviewNote: note || null,
    },
  });
  await logAdminAction(
    actorId,
    decision === "APPROVED" ? "credential.approve" : "credential.reject",
    { type: "certification", id, meta: { title: cert.title, note: note || null } }
  );
  revalidatePath("/admin/verifications");
  redirect("/admin/verifications?reviewed=1");
}

/** Monetization: update the platform commission (%,0–50). */
export async function updatePlatformFeeAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const raw = Number(String(formData.get("feePct") ?? ""));
  if (!Number.isFinite(raw) || raw < 0 || raw > 50) {
    redirect("/admin/payments?error=fee");
  }
  const previous = await getPlatformFeePct();
  await setSetting("platformFeePct", String(raw), actorId);
  await logAdminAction(actorId, "setting.update", {
    type: "setting",
    id: "platformFeePct",
    meta: { from: previous, to: raw },
  });
  revalidatePath("/admin/payments");
  redirect("/admin/payments?feesaved=1");
}

/**
 * KRA compliance: withholding-tax rate applied to worker earnings (%,0–30;
 * 0 disables withholding — e.g. for admins who have granted a documented
 * exemption). Past statements keep their snapshotted rate.
 */
export async function updateWhtRateAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const raw = Number(String(formData.get("whtPct") ?? ""));
  if (!Number.isFinite(raw) || raw < 0 || raw > 30) {
    redirect("/admin/payments?error=wht");
  }
  const previous = await getWhtRatePct();
  await setSetting("whtRatePct", String(raw), actorId);
  await logAdminAction(actorId, "setting.update", {
    type: "setting",
    id: "whtRatePct",
    meta: { from: previous, to: raw },
  });
  revalidatePath("/admin/payments");
  redirect("/admin/payments?whtsaved=1");
}

/** Moderation: remove a review that breaks platform rules. */
export async function deleteReviewAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (id) {
    const review = await prisma.review.findUnique({ where: { id } });
    await prisma.review.delete({ where: { id } }).catch(() => undefined);
    if (review) {
      await logAdminAction(actorId, "review.delete", {
        type: "review",
        id,
        meta: { targetId: review.targetId, rating: review.rating },
      });
    }
  }
  revalidatePath("/admin");
  redirect("/admin/audit?deleted=1");
}

/** Promote a user to ADMIN or demote a non-admin back to CLIENT/WORKER. */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !["CLIENT", "WORKER", "ADMIN"].includes(role)) {
    redirect("/admin/users?error=badinput");
  }

  if (id === actorId) redirect("/admin/users?error=self"); // cannot change own role

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) redirect("/admin/users?error=notfound");

  await prisma.user.update({ where: { id }, data: { role: role as "CLIENT" | "WORKER" | "ADMIN" } });
  await logAdminAction(actorId, target.role === "ADMIN" ? "user.demote" : "user.promote", {
    type: "user",
    id,
    meta: { from: target.role, to: role },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users?rolechanged=1");
}

/** Admin supervision: force-cancel any booking on the platform. */
export async function adminCancelBookingAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) redirect("/admin/bookings?error=notfound");
  if (booking.status === "PENDING" || booking.status === "ACCEPTED") {
    await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
    await logAdminAction(actorId, "booking.cancel", {
      type: "booking",
      id,
      meta: { clientId: booking.clientId, workerId: booking.workerId },
    });
  }
  redirect("/admin/bookings?cancelled=1");
}

/** Mark a contact-form message as handled (or reopen it). */
export async function setContactHandledAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const handled = formData.get("handled") === "1";

  await prisma.contactMessage.update({
    where: { id },
    data: { handledAt: handled ? new Date() : null },
  });
  if (handled) {
    await logAdminAction(actorId, "contact.resolve", { type: "contact", id });
  }
  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

/** Delete a contact-form message permanently. */
export async function deleteContactMessageAction(formData: FormData): Promise<void> {
  const actorId = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.contactMessage.delete({ where: { id } }).catch(() => undefined);
    await logAdminAction(actorId, "contact.delete", { type: "contact", id });
  }
  revalidatePath("/admin/messages");
  redirect("/admin/messages?deleted=1");
}
