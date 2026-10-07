import { NextResponse } from "next/server";

/** GET /api/push/public-key — the VAPID public key the PWA needs to subscribe. */
export async function GET(): Promise<NextResponse> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
  return NextResponse.json({ enabled: true, publicKey });
}
