import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markEmailVerified } from "@/lib/verify";

/**
 * POST /api/auth/email-confirmed
 *
 * Landing strip for the emailed confirm *link*: the browser arrives from
 * GoTrue with the token in the URL hash (never sent to the server), exchanges
 * it for the Supabase profile here, and we flip emailVerifiedAt for whoever
 * is signed in — or for the account the token belongs to.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = body.token ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const SUP = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUP || !ANON) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const res = await fetch(`${SUP}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });

  const profile = (await res.json().catch(() => ({}))) as {
    email?: string;
    email_confirmed_at?: string | null;
  };
  if (!profile.email) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  if (!profile.email_confirmed_at) {
    return NextResponse.json({ error: "Address not confirmed yet" }, { status: 409 });
  }

  await markEmailVerified(profile.email);
  const user = await prisma.user.findUnique({
    where: { email: profile.email.toLowerCase() },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, userId: user?.id ?? null });
}
