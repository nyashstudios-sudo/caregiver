"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/posts", label: "Blog posts" },
  { href: "/admin/posts/new", label: "New post" },
  { href: "/admin/messages", label: "Messages" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              active
                ? "border-brand bg-brand text-white dark:text-[#04231f]"
                : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
