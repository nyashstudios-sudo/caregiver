import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "./password";
import { isValidPhone, normalizePhone, verifyOtp } from "./otp";
import type { Role } from "@prisma/client";

/** "Continue with Google" appears only when OAuth creds are configured. */
export function googleEnabled(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Google sign-in: resolve (or provision) our User row before the JWT is
     * minted, so sessions carry the same id/role as every other sign-in path.
     * The intended role travels in a 5-minute cookie set by the signup form.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;

      const email = user.email.toLowerCase();
      try {
        const existing = await prisma.user.findUnique({
          where: { email },
          include: { profile: { select: { id: true } } },
        });
        if (existing) {
          if (existing.status === "SUSPENDED") return false;
          user.id = existing.id;
          (user as { role?: Role }).role = existing.role;
          // Keep the display name fresh from Google.
          if (!existing.profile && user.name) {
            await prisma.profile.create({
              data: { userId: existing.id, fullName: user.name, location: "Nairobi, Kenya" },
            });
          }
          return true;
        }

        const roleCookie = (await cookies()).get("google_role")?.value;
        const role: Role = roleCookie === "WORKER" ? "WORKER" : "CLIENT";
        const created = await prisma.user.create({
          data: {
            email,
            // Unusable random hash — this account can only sign in via Google.
            passwordHash: await hashPassword(randomBytes(32).toString("hex")),
            role,
            profile: {
              create: {
                fullName: user.name ?? email.split("@")[0],
                location: "Nairobi, Kenya",
                avatarUrl: user.image ?? null,
                ...(role === "WORKER"
                  ? { caretakerDetails: { create: { hourlyRate: 500, yearsExperience: 0 } } }
                  : {}),
              },
            },
          },
        });
        user.id = created.id;
        (user as { role?: Role }).role = created.role;
        return true;
      } catch (err) {
        console.error("[auth:google]", err);
        return false;
      }
    },
  },
  providers: [
    ...(googleEnabled()
      ? [
          Google({
            allowDangerousEmailAccountLinking: true, // same email = same account
          }),
        ]
      : []),
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true },
        });
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        if (user.status === "SUSPENDED") return null;

        void prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? null,
          image: user.profile?.avatarUrl ?? null,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "phone",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "One-time code", type: "text" },
      },
      async authorize(credentials) {
        const phone = normalizePhone(String(credentials?.phone ?? ""));
        const code = String(credentials?.code ?? "").trim();
        if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) return null;

        const valid = await verifyOtp(phone, code);
        if (!valid) return null;

        const user = await prisma.user.findUnique({
          where: { phone },
          include: { profile: true },
        });
        if (!user || user.status === "SUSPENDED") return null;

        void prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? null,
          image: user.profile?.avatarUrl ?? null,
          role: user.role,
        };
      },
    }),
  ],
});
