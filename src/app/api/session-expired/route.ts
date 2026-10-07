import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * GET /api/session-expired
 *
 * A JWT can outlive its account (deleted, suspended, re-seeded). Middleware
 * trusts the cookie while pages trust the database, so a stale cookie would
 * ping-pong forever between them. This endpoint is the escape hatch: it wipes
 * every NextAuth cookie and lands on a clean login screen.
 *
 * /api/* is outside the middleware matcher, so nothing can bounce it.
 */
export async function GET(): Promise<never> {
  const jar = await cookies();
  for (const cookie of jar.getAll()) {
    if (cookie.name.includes("authjs") || cookie.name.includes("next-auth")) {
      jar.delete(cookie.name);
    }
  }
  redirect("/login?expired=1");
}
