import { auth } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  email: string;
  name: string | null;
};

/**
 * Resolves the session user against the database so every request sees the
 * truth — fresh role (admin demotions apply instantly), deleted accounts are
 * logged out, and suspended accounts lose access without waiting for their
 * JWT to expire.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      role: true,
      email: true,
      status: true,
      profile: { select: { fullName: true } },
    },
  });
  if (!user || user.status === "SUSPENDED") return null;

  return {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.profile?.fullName ?? sessionUser.name ?? null,
  };
}

/**
 * Guard for protected pages & server actions.
 *
 * Distinguishes two "no user" cases that middleware (edge, JWT-only) cannot:
 *  1. No cookie at all → straight to /login with a safe ?next=.
 *  2. Valid JWT but the account is gone or suspended → the cookie would keep
 *     bouncing between middleware (trusts JWT) and pages (trust the DB), so
 *     send the browser to /api/session-expired which clears the cookie first.
 */
export async function requireSession(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user) return user;

  const session = await auth();
  if (session?.user?.id) {
    redirect("/api/session-expired");
  }

  const safe =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  redirect(`/login?next=${encodeURIComponent(safe)}`);
}
