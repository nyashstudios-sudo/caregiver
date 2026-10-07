import Link from "next/link";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/caretakers", label: "Find caretakers" },
      { href: "/signup?role=CLIENT", label: "Hire a caretaker" },
      { href: "/signup?role=WORKER", label: "Offer care services" },
      { href: "/dashboard", label: "My bookings" },
      { href: "/admin", label: "Admin" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/blog", label: "Blog" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-base font-black text-white dark:text-[#04231f]"
            >
              C
            </span>
            <span className="text-xl font-extrabold tracking-tight text-ink">Caregiver</span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Kenya&apos;s home care &amp; management platform — hire verified caretakers, house
            managers and wellness professionals, or grow your care career.
          </p>
          <address className="mt-4 space-y-1 text-sm not-italic text-muted">
            <p>Riverside Square, Westlands</p>
            <p>Nairobi, Kenya</p>
            <p>
              <a href="tel:+254700000000" className="hover:text-brand">
                +254 700 000 000
              </a>
            </p>
            <p>
              <a href="mailto:info@caregiver.co.ke" className="hover:text-brand">
                info@caregiver.co.ke
              </a>
            </p>
          </address>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink">
              {column.title}
            </h3>
            <ul className="space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-muted transition hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} Caregiver Ltd. All rights reserved. Made in Nairobi,
            Kenya 🇰🇪
          </p>
          <p>Data handled in line with Kenya&apos;s Data Protection Act, 2019.</p>
        </div>
      </div>
    </footer>
  );
}
