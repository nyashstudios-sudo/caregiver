"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Role = "CLIENT" | "WORKER" | "ADMIN";

type Item = { href: string; label: string; icon: ReactNode };

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.8V21h14V9.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4m8-4v4M3 10h18" strokeLinecap="round" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" strokeLinejoin="round" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" strokeLinecap="round" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <rect x="3" y="7" width="18" height="13" rx="2.2" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" strokeLinecap="round" />
    </svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" />
      <path d="m10 17 5-5-5-5m5 5H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" strokeLinecap="round" />
    </svg>
  ),
};

function itemsFor(role: Role | undefined): Item[] {
  if (role === "WORKER") {
    return [
      { href: "/", label: "Home", icon: ICONS.home },
      { href: "/caretakers", label: "Browse", icon: ICONS.search },
      { href: "/dashboard", label: "Requests", icon: ICONS.calendar },
      { href: "/messages", label: "Messages", icon: ICONS.chat },
      { href: "/worker", label: "Portal", icon: ICONS.briefcase },
    ];
  }
  if (role === "ADMIN") {
    // Operator tab bar: command center, vetting, moderation inbox — no
    // client/worker booking surfaces.
    return [
      { href: "/admin", label: "Admin", icon: ICONS.grid },
      { href: "/admin/verifications", label: "Verify", icon: ICONS.briefcase },
      { href: "/admin/users", label: "Users", icon: ICONS.user },
      { href: "/admin/messages", label: "Inbox", icon: ICONS.chat },
      { href: "/messages", label: "Chat", icon: ICONS.calendar },
    ];
  }
  if (role === "CLIENT") {
    return [
      { href: "/", label: "Home", icon: ICONS.home },
      { href: "/caretakers", label: "Browse", icon: ICONS.search },
      { href: "/dashboard", label: "Bookings", icon: ICONS.calendar },
      { href: "/messages", label: "Messages", icon: ICONS.chat },
      { href: "/account", label: "Account", icon: ICONS.user },
    ];
  }
  return [
    { href: "/", label: "Home", icon: ICONS.home },
    { href: "/caretakers", label: "Browse", icon: ICONS.search },
    { href: "/blog", label: "Blog", icon: ICONS.book },
    { href: "/login", label: "Sign in", icon: ICONS.login },
  ];
}

/** Fixed bottom tab bar on phones (md+ uses the top header instead). */
export function BottomNav({ role }: { role?: Role }) {
  const pathname = usePathname();
  const items = itemsFor(role);

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  active ? "text-brand" : "text-muted hover:text-ink"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
