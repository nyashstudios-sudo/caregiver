import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Phone login uses one-time codes. In production these would be sent by SMS;
 * here the code is delivered through a short-lived, signed httpOnly cookie and
 * surfaced to the UI (dev-mode) so the flow can be completed without an SMS
 * provider. No server-side state is required, so it survives dev reloads.
 */

const COOKIE = "hc_otp";
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  return process.env.AUTH_SECRET || "dev-insecure-secret";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return (trimmed.startsWith("+") ? "+" : "+") + digits;
}

export function isValidPhone(phone: string): boolean {
  return /^\+\d{7,15}$/.test(phone);
}

export async function issueOtp(phone: string): Promise<string> {
  const code = crypto.randomInt(100000, 999999).toString();
  const body = Buffer.from(
    JSON.stringify({ phone, code, exp: Date.now() + TTL_MS }),
    "utf8"
  ).toString("base64url");
  const token = `${body}.${sign(body)}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      phone: string;
      code: string;
      exp: number;
    };
    if (payload.exp < Date.now()) return false;
    if (payload.phone !== phone) return false;
    if (payload.code !== code) return false;
    store.delete(COOKIE);
    return true;
  } catch {
    return false;
  }
}
