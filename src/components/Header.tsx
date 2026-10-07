import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { signOutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/session";

function initialsOf(name: string | null, email: string): string {
  const source = name || email || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const NAV_LINKS = [
  { href: "/caretakers", label: "Find caretakers" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ", authOnlyHide: true },
  { href: "/about", label: "About", authOnlyHide: true },
  { href: "/contact", label: "Contact", authOnlyHide: true },
];

export function Header({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        {/* Brand */}
        <Logo size={36} />

        {/*
          Desktop nav — informational links drop out once signed in, and the
          admin role gets an operator-only set (no booking/wallet surfaces).
        */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
          {user?.role === "ADMIN" ? (
            <>
              <Link href="/admin" className="transition hover:text-brand">
                Admin portal
              </Link>
              <Link href="/admin/verifications" className="transition hover:text-brand">
                Verifications
              </Link>
              <Link href="/blog" className="transition hover:text-brand">
                Blog
              </Link>
              <Link href="/messages" className="transition hover:text-brand">
                Messages
              </Link>
            </>
          ) : (
            <>
              {NAV_LINKS.filter((link) => !link.authOnlyHide || !user).map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-brand">
                  {link.label}
                </Link>
              ))}
              {user && user.role === "CLIENT" && (
                <Link href="/dashboard" className="transition hover:text-brand">
                  My bookings
                </Link>
              )}
              {user && user.role === "WORKER" && (
                <Link href="/worker" className="transition hover:text-brand">
                  Worker portal
                </Link>
              )}
              {user && (
                <Link href="/messages" className="transition hover:text-brand">
                  Messages
                </Link>
              )}
              {user && (
                <Link href="/wallet" className="transition hover:text-brand">
                  Wallet
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/account"
                className="hidden items-center gap-2 text-sm text-ink transition hover:text-brand md:flex"
                title="Account settings"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-on-soft">
                  {initialsOf(user.name, user.email)}
                </span>
                <span className="max-w-[9rem] truncate font-semibold">
                  {user.name || user.email}
                </span>
              </Link>
              <Link href="/messages" className="btn btn-secondary sm:hidden" aria-label="Messages">
                ✉️
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="btn btn-secondary">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary hidden sm:inline-flex">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
