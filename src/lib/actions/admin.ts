"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireSession } from "@/lib/session";

async function requireAdmin(): Promise<void> {
  const user = await requireSession("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
}

/**
 * Suspend or restore a user account. Suspended users cannot sign in or
 * send messages; their profiles are hidden from the public directory.
 */
export async function setUserStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "ACTIVE" && status !== "SUSPENDED")) {
    redirect("/admin/users?error=badinput");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) redirect("/admin/users?error=notfound");

  // Never let an admin suspend their own lifeline.
  const me = await getSessionUser();
  if (target.role === "ADMIN" && id !== me?.id) redirect("/admin/users?error=admin");

  await prisma.user.update({ where: { id }, data: { status } });
  revalidatePath("/admin/users");
  redirect(`/admin/users?${status === "SUSPENDED" ? "suspended" : "restored"}=1`);
}

/** Promote a user to ADMIN or demote a non-admin back to CLIENT/WORKER. */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !["CLIENT", "WORKER", "ADMIN"].includes(role)) {
    redirect("/admin/users?error=badinput");
  }

  const me = await getSessionUser();
  if (id === me?.id) redirect("/admin/users?error=self"); // cannot change own role

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) redirect("/admin/users?error=notfound");

  await prisma.user.update({ where: { id }, data: { role: role as "CLIENT" | "WORKER" | "ADMIN" } });
  revalidatePath("/admin/users");
  redirect("/admin/users?rolechanged=1");
}

/** Admin supervision: force-cancel any booking on the platform. */
export async function adminCancelBookingAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) redirect("/dashboard?error=notfound");
  if (booking.status === "PENDING" || booking.status === "ACCEPTED") {
    await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  }
  redirect("/admin/bookings?cancelled=1");
}

/** Mark a contact-form message as handled (or reopen it). */
export async function setContactHandledAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const handled = formData.get("handled") === "1";

  await prisma.contactMessage.update({
    where: { id },
    data: { handledAt: handled ? new Date() : null },
  });
  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

/** Delete a contact-form message permanently. */
export async function deleteContactMessageAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.contactMessage.delete({ where: { id } }).catch(() => undefined);
  }
  revalidatePath("/admin/messages");
  redirect("/admin/messages?deleted=1");
}
