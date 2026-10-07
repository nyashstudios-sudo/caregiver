"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isValidPhone, issueOtp, normalizePhone } from "@/lib/otp";
import { safeNext } from "@/lib/roles";
import { sendVerificationEmail } from "@/lib/verify";
import { clearFailures, isBlocked, registerFailure } from "@/lib/throttle";
import type { ActionState } from "./state";

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name"),
    email: z.email({ message: "Enter a valid email address" }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((v) => /[A-Za-z]/.test(v), "Password needs at least one letter")
      .refine((v) => /\d/.test(v), "Password needs at least one number"),
    confirmPassword: z.string(),
    role: z.enum(["CLIENT", "WORKER"], { message: "Choose an account type" }),
    location: z.string().trim().min(1, "Please enter your location"),
    phone: z.string().trim().default(""),
    terms: z.literal("on", { message: "Please accept the terms to continue" }),
    // Worker onboarding — feeds CaretakerDetails straight from signup.
    bio: z.string().trim().max(600, "Bio is too long").optional().default(""),
    yearsExperience: z.coerce
      .number({ message: "Years of experience is required" })
      .int("Years of experience must be a whole number")
      .min(0, "Years of experience cannot be negative")
      .max(60, "That seems too high — enter years under 60")
      .optional(),
    hourlyRate: z.coerce
      .number({ message: "Hourly rate is required" })
      .min(100, "Minimum rate is KES 100/hour")
      .max(20000, "Maximum rate is KES 20,000/hour")
      .optional(),
    skillsSummary: z.string().trim().max(400, "Skills list is too long").optional().default(""),
    hasFirstAid: z.coerce.boolean().optional().default(false),
    isCertifiedMassage: z.coerce.boolean().optional().default(false),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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
    confirmPassword: formData.get("confirmPassword") ?? formData.get("password"),
    role: formData.get("role"),
    location: formData.get("location"),
    phone: formData.get("phone") ?? "",
    terms: formData.get("terms"),
    bio: formData.get("bio") ?? "",
    yearsExperience: formData.get("yearsExperience") ?? undefined,
    hourlyRate: formData.get("hourlyRate") ?? undefined,
    skillsSummary: formData.get("skillsSummary") ?? "",
    hasFirstAid: formData.get("hasFirstAid") === "on",
    isCertifiedMassage: formData.get("isCertifiedMassage") === "on",
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const { fullName, password, role, location } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : "";

  if (phone && !isValidPhone(phone)) {
    return { error: "Phone must look like +254712345678" };
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
          bio: parsed.data.bio || null,
          caretakerDetails:
            role === "WORKER"
              ? {
                  create: {
                    hourlyRate: parsed.data.hourlyRate ?? 500,
                    yearsExperience: parsed.data.yearsExperience ?? 0,
                    hasFirstAid: parsed.data.hasFirstAid ?? false,
                    isCertifiedMassage: parsed.data.isCertifiedMassage ?? false,
                    skillsSummary: parsed.data.skillsSummary || null,
                  },
                }
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

  // Kick off email verification — welcome screen shows the code entry.
  await sendVerificationEmail(email).catch(() => undefined);
  redirect("/welcome");
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
  if (user.status === "SUSPENDED") {
    return {
      error:
        "This account has been suspended. Please contact Caregiver support on info@caregiver.co.ke.",
    };
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
  if (user.status === "SUSPENDED") {
    return { error: "This account has been suspended. Please contact support." };
  }

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
