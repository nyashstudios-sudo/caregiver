/**
 * Email verification powered by Supabase (GoTrue) — we borrow Supabase's
 * built-in email service to deliver the code/link, then confirm it back into
 * our own `User.emailVerifiedAt`.
 *
 * Two paths land on the same outcome:
 *  1. Code path   — the email carries a one-time code; the server exchanges it
 *                   against /auth/v1/verify and checks email_confirmed_at.
 *  2. Link path   — the email's confirm link runs GoTrue's verify server-side
 *                   and redirects to /welcome/verified, which finishes the
 *                   handoff by calling back into our API.
 *
 * Everything here degrades gracefully: if Supabase email is unavailable the
 * account still works (verification is enforced only where trust matters),
 * and admins can always verify manually from /admin/users.
 */

import { prisma } from "./prisma";

const RESEND_COOLDOWN_MS = 60_000;

function supabaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url || null;
}

function serviceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function anonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function emailDeliveryConfigured(): boolean {
  return Boolean(supabaseUrl() && serviceKey() && anonKey());
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

type AuthUserResult = { id?: string; msg?: string; code?: string };

/** Create (or reuse) a companion GoTrue user purely to carry the email. */
async function ensureAuthUser(email: string): Promise<string | null> {
  const SUP = supabaseUrl();
  const KEY = serviceKey();
  if (!SUP || !KEY) return null;

  const res = await fetch(`${SUP}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: `Vfy#${Math.random().toString(36).slice(2, 12)}${Date.now()}!aA1`,
      email_confirm: false,
    }),
  });

  if (res.ok) {
    const body = (await res.json().catch(() => ({}))) as AuthUserResult;
    return body.id ?? null;
  }

  // 409 = already exists; fetch it so we can still target OTP delivery.
  if (res.status === 409) {
    const list = await fetch(
      `${SUP}/auth/v1/admin/users?page=1&per_page=200`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
    ).catch(() => null);
    if (list?.ok) {
      const body = (await list.json().catch(() => ({ users: [] }))) as {
        users?: { id: string; email?: string }[];
      };
      const hit = body.users?.find((u) => u.email?.toLowerCase() === email);
      if (hit) return hit.id;
    }
  }
  return null;
}

/**
 * Queue a verification email. Returns:
 *  "sent"     — Supabase accepted the send
 *  "cooldown" — user requested again too soon
 *  "unavailable" — email credentials missing or Supabase refused
 */
export async function sendVerificationEmail(
  email: string,
  opts: { force?: boolean } = {}
): Promise<"sent" | "cooldown" | "unavailable"> {
  if (!emailDeliveryConfigured()) return "unavailable";

  const normalized = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { emailVerifiedAt: true, verifySentAt: true },
  });
  if (!user) return "unavailable";
  if (user.emailVerifiedAt) return "sent";
  if (
    !opts.force &&
    user.verifySentAt &&
    Date.now() - user.verifySentAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return "cooldown";
  }

  try {
    await ensureAuthUser(normalized);
    const SUP = supabaseUrl()!;
    const ANON = anonKey()!;
    const res = await fetch(`${SUP}/auth/v1/otp`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalized,
        redirect_to: `${siteUrl()}/welcome/verified`,
      }),
    });
    if (!res.ok && res.status !== 429) return "unavailable";
    await prisma.user.update({
      where: { email: normalized },
      data: { verifySentAt: new Date() },
    });
    return "sent";
  } catch {
    return "unavailable";
  }
}

type VerifyResponse = { access_token?: string; user?: { email_confirmed_at?: string | null } };

/**
 * Exchange a code from the email for confirmation. Returns true when GoTrue
 * confirms the address (or the account is already marked verified).
 */
export async function confirmEmailCode(email: string, code: string): Promise<boolean> {
  if (!emailDeliveryConfigured()) return false;
  const normalized = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, emailVerifiedAt: true },
  });
  if (!user) return false;
  if (user.emailVerifiedAt) return true;

  const SUP = supabaseUrl()!;
  const KEY = serviceKey()!;
  for (const type of ["magiclink", "signup", "email"] as const) {
    try {
      const res = await fetch(`${SUP}/auth/v1/verify`, {
        method: "POST",
        headers: { apikey: KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, token: code, type }),
      });
      if (!res.ok) continue;
      const body = (await res.json().catch(() => ({}))) as VerifyResponse;

      // Ask GoTrue whether the address is now confirmed — the source of truth.
      let confirmed = Boolean(body.user?.email_confirmed_at);
      if (!confirmed && body.access_token) {
        const me = await fetch(`${SUP}/auth/v1/user`, {
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${body.access_token}`,
          },
        }).catch(() => null);
        if (me?.ok) {
          const profile = (await me.json().catch(() => ({}))) as {
            email_confirmed_at?: string | null;
          };
          confirmed = Boolean(profile.email_confirmed_at);
        }
      }
      if (confirmed || type === "magiclink") {
        await markEmailVerified(normalized);
        return true;
      }
    } catch {
      // try the next verification type
    }
  }
  return false;
}

/** Called by the link-path callback once GoTrue has confirmed the address. */
export async function markEmailVerified(email: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { emailVerifiedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}
