import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
};

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  return user?.id ?? null;
}

/** POST /api/push/subscribe — store (or refresh) this device's subscription. */
export async function POST(req: Request): Promise<NextResponse> {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as SubBody;
  const endpoint = body.endpoint ?? "";
  const p256dh = body.keys?.p256dh ?? "";
  const authKey = body.keys?.auth ?? "";
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Malformed subscription" }, { status: 400 });
  }
  if (endpoint.length > 2000) {
    return NextResponse.json({ error: "Endpoint too long" }, { status: 400 });
  }

  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 250);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth: authKey, userAgent },
    create: { userId, endpoint, p256dh, auth: authKey, userAgent },
  });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe — unsubscribe this device. */
export async function DELETE(req: Request): Promise<NextResponse> {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint: body.endpoint, userId } })
      .catch(() => undefined);
  } else {
    await prisma.pushSubscription.deleteMany({ where: { userId } }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
