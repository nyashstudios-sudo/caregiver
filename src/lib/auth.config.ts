import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Prisma / Node-only imports) so it can be bundled
 * into middleware. The full config with database-backed providers lives in
 * `src/lib/auth.ts` and spreads this one.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user && "role" in user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = (token.role as "CLIENT" | "WORKER" | "ADMIN") ?? "CLIENT";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
