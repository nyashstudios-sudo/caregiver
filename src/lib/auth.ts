import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";
import { isValidPhone, normalizePhone, verifyOtp } from "./otp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
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
        if (!user) return null;

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
