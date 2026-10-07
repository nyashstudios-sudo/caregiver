"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { confirmEmailCode, sendVerificationEmail } from "@/lib/verify";
import { homeForRole } from "@/lib/roles";
import { registerFailure, isBlocked } from "@/lib/throttle";
import type { ActionState } from "./state";

/**
 * Exchange the 6-digit code from the verification email. On success the
 * account is marked verified and the browser lands back on the role home
 * with ?verified=1 so the UI can celebrate it.
 */
export async function verifyEmailCodeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/welcome");
  const code = String(formData.get("code") ?? "").trim();

  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter the 6-digit code from your email" };
  }

  const throttleKey = `verify:${user.id}`;
  if (isBlocked(throttleKey)) {
    return { error: "Too many attempts. Please wait about10 minutes before trying again." };
  }
  registerFailure(throttleKey);

  const confirmed = await confirmEmailCode(user.email, code);
  if (!confirmed) {
    return { error: "That code is invalid or has expired — request a new one." };
  }

  redirect(`${homeForRole(user.role)}?verified=1`);
}

/**
 * (Re)send the verification email. The cooldown lives server-side in
 * verifySentAt, so refreshing the page can't sneak past it.
 */
export async function resendVerificationAction(
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  void prev;
  void formData;
  const user = await requireSession("/welcome");

  const status = await sendVerificationEmail(user.email, { force: false });
  switch (status) {
    case "sent":
      return { ok: true, message: "New code on its way — check your inbox." };
    case "cooldown":
      return { message: "Already sent — wait a minute before requesting another." };
    default:
      return {
        error:
          "Email delivery isn't available right now. Your account works fine — an admin can verify it from the admin portal.",
      };
  }
}
