"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isValidPhone, issueOtp, normalizePhone } from "@/lib/otp";
import { safeNext } from "@/lib/roles";
import { clearFailures, isBlocked, registerFailure } from "@/lib/throttle";
import type { ActionState } from "./state";

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  email: z.email({ message: "Enter a valid email address" }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CLIENT", "WORKER"], { message: "Choose an account type" }),
  location: z.string().trim().min(1, "Please enter your location"),
  phone: z.string().trim().default(""),
});

const loginSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z.string().min(1, "Enter your password"),
});

function isRedirectError(err: unknown): boolean {
  const digest = (err as { digest?: string } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/** Email + password signup with CLIENT/WORKER role choice. */
export async function signupAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    location: formData.get("location"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const { fullName, password, role, location } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : "";

  if (phone && !isValidPhone(phone)) {
    return { error: "Phone must look like +263771234567" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists" };

  if (phone) {
    const phoneTaken = await prisma.user.findUnique({ where: { phone } });
    if (phoneTaken) return { error: "An account with this phone number already exists" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      phone: phone || null,
      passwordHash,
      role,
      profile: {
        create: {
          fullName,
          location,
          caretakerDetails:
            role === "WORKER"
              ? { create: { hourlyRate: 15, yearsExperience: 0 } }
              : undefined,
        },
      },
    },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    // Account exists; let them sign in manually.
    redirect("/login?registered=1");
  }

  redirect(safeNext(String(formData.get("next") ?? ""), role));
}

/** Email + password login. */
export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const email = parsed.data.email.toLowerCase();
  const throttleKey = `login:${email}`;
  if (isBlocked(throttleKey)) {
    return {
      error: "Too many sign-in attempts. Please wait about10 minutes and try again.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    registerFailure(throttleKey);
    return { error: "Invalid email or password" };
  }
  clearFailures(throttleKey);

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Could not start your session, please try again" };
  }

  redirect(safeNext(String(formData.get("next") ?? ""), user.role));
}

/** Step 1 of phone login: issue a one-time code (dev stand-in for SMS). */
export async function sendOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!isValidPhone(phone)) {
    return { error: "Enter a valid phone number, e.g. +263771234567" };
  }

  const sendKey = `send-otp:${phone}`;
  if (isBlocked(sendKey)) {
    return { error: "Too many codes requested. Please wait a few minutes." };
  }
  registerFailure(sendKey);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return { error: "No account is linked to this phone number" };

  const code = await issueOtp(phone);
  return {
    ok: true,
    devCode: code,
  };
}

/** Step 2 of phone login: verify the code and start a session. */
export async function loginWithPhoneAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();

  if (!isValidPhone(phone)) return { error: "Enter a valid phone number" };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code" };

  const otpKey = `otp:${phone}`;
  if (isBlocked(otpKey)) {
    return { error: "Too many attempts. Please wait about10 minutes and try again." };
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return { error: "No account is linked to this phone number" };

  try {
    await signIn("phone", { phone, code, redirect: false });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    registerFailure(otpKey);
    return { error: "Invalid or expired code" };
  }
  clearFailures(otpKey);

  redirect(safeNext(String(formData.get("next") ?? ""), user.role));
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
