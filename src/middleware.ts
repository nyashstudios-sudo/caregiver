import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { homeForRole } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (req.auth) {
    // Signed-in users never see the auth screens again.
    if (isAuthPage) {
      return NextResponse.redirect(new URL(homeForRole(role), req.nextUrl));
    }
    // Workers manage their own portal; everyone else is kept out.
    if (pathname.startsWith("/worker") && role !== "WORKER") {
      return NextResponse.redirect(
        new URL(role === "ADMIN" ? "/admin" : "/dashboard", req.nextUrl)
      );
    }
    // The admin dashboard is strictly for ADMIN accounts.
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    // Admins are strictly operators — no client/worker surfaces for them.
    if (role === "ADMIN" && ["/dashboard", "/wallet"].some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/worker") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/wallet")
  ) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/worker/:path*",
    "/admin/:path*",
    "/messages/:path*",
    "/account/:path*",
    "/wallet/:path*",
    "/login",
    "/signup",
  ],
};
