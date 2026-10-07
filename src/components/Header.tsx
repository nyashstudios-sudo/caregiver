import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
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
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-base font-black text-white dark:text-[#04231f]"
          >
            C
          </span>
          <span className="text-xl font-extrabold tracking-tight text-ink">
            Caregiver
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-brand">
              {link.label}
            </Link>
          ))}
          {user && (user.role === "CLIENT" || user.role === "ADMIN") && (
            <Link href="/dashboard" className="transition hover:text-brand">
              My bookings
            </Link>
          )}
          {user && user.role === "WORKER" && (
            <Link href="/worker" className="transition hover:text-brand">
              Worker portal
            </Link>
          )}
          {user && user.role === "ADMIN" && (
            <Link href="/admin" className="transition hover:text-brand">
              Admin
            </Link>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden items-center gap-2 text-sm text-ink md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-on-soft">
                  {initialsOf(user.name, user.email)}
                </span>
                <span className="max-w-[9rem] truncate font-semibold">
                  {user.name || user.email}
                </span>
              </span>
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
