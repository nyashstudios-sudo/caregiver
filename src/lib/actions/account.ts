"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { registerFailure, isBlocked, clearFailures } from "@/lib/throttle";
import type { ActionState } from "./state";

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}

const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  location: z.string().trim().min(1, "Please enter your location"),
  phone: z.string().trim().default(""),
  bio: z.string().trim().max(1000, "Bio is too long").optional().default(""),
  avatarUrl: z.string().trim().optional().default(""),
});

/** Account settings → profile details (name, location, phone, avatar, bio). */
export async function updateAccountDetailsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/account");

  const parsed = detailsSchema.safeParse({
    fullName: formData.get("fullName"),
    location: formData.get("location"),
    phone: formData.get("phone") ?? "",
    bio: formData.get("bio") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const { fullName, location, bio, avatarUrl, phone } = parsed.data;

  // Phone numbers are optional but must be unique when provided.
  let normalizedPhone: string | null = null;
  if (phone) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (!/^\+\d{7,15}$/.test(digits)) {
      return { error: "Phone must look like +254712345678" };
    }
    const taken = await prisma.user.findFirst({
      where: { phone: digits, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) return { error: "Another account already uses that phone number" };
    normalizedPhone = digits;
  }

  const existing = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (existing) {
    await prisma.profile.update({
      where: { id: existing.id },
      data: {
        fullName,
        location,
        bio: bio || null,
        avatarUrl: avatarUrl || existing.avatarUrl,
      },
    });
  } else {
    await prisma.profile.create({
      data: { userId: user.id, fullName, location, bio: bio || null, avatarUrl: avatarUrl || null },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { phone: normalizedPhone },
  });

  redirect("/account?saved=details");
}

const passwordSchema = z.object({
  current: z.string().min(1, "Enter your current password"),
  next: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128, "New password is too long"),
  confirm: z.string(),
});

/** Account settings → change password (verified against the current one). */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/account");

  const throttleKey = `pw-change:${user.id}`;
  if (isBlocked(throttleKey)) {
    return { error: "Too many password attempts. Please wait about 10 minutes." };
  }

  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: zodError(parsed.error) };
  if (parsed.data.next !== parsed.data.confirm) {
    return { error: "New passwords do not match" };
  }
  if (parsed.data.next === parsed.data.current) {
    return { error: "Choose a password different from your current one" };
  }

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(parsed.data.current, record.passwordHash))) {
    registerFailure(throttleKey);
    return { error: "Your current password is incorrect" };
  }
  clearFailures(throttleKey);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });

  redirect("/account?saved=password");
}

/** Account settings → communication preferences. */
export async function updatePreferencesAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/account");

  await prisma.user.update({
    where: { id: user.id },
    data: { notifyByEmail: formData.get("notifyByEmail") === "on" },
  });

  redirect("/account?saved=prefs");
}

const deleteSchema = z.object({
  password: z.string().min(1, "Confirm with your password"),
  confirm: z.string().regex(/^DELETE$/, "Type DELETE to confirm"),
});

/**
 * Account settings → delete account. Admins cannot delete themselves;
 * clients and workers are removed together with their profiles.
 */
export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/account");
  if (user.role === "ADMIN") {
    return { error: "Admin accounts cannot be deleted from account settings" };
  }

  const throttleKey = `acct-delete:${user.id}`;
  if (isBlocked(throttleKey)) {
    return { error: "Too many attempts. Please wait about 10 minutes." };
  }

  const parsed = deleteSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(parsed.data.password, record.passwordHash))) {
    registerFailure(throttleKey);
    return { error: "Password is incorrect" };
  }
  clearFailures(throttleKey);

  // Profile, messages and bookings cascade with the user (schema onDelete).
  await prisma.user.delete({ where: { id: user.id } });

  redirect("/?deleted=1");
}
