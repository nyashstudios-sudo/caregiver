import Link from "next/link";

/**
 * Caregiver brand mark — teal gradient tile with the heart-in-“C” glyph.
 * Single source of truth for the logo (header, footers, auth screens).
 */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Caregiver logo"
    >
      <defs>
        <linearGradient id="cg-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="0.55" stopColor="#0d9488" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cg-brand)" />
      <path
        d="M45.6 19A20 20 0 1 0 45.6 45"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M32 36.5c-6-4.4-9.5-7.4-9.5-11.2a5.4 5.4 0 0 1 9.5-3.1 5.4 5.4 0 0 1 9.5 3.1c0 3.8-3.5 6.8-9.5 11.2z"
        fill="#ffffff"
      />
    </svg>
  );
}

/** Logo lockup — mark + wordmark, links home by default. */
export function Logo({
  href = "/",
  size = 36,
  wordClass = "text-xl font-extrabold tracking-tight text-ink",
  className = "",
}: {
  href?: string;
  size?: number;
  wordClass?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className={wordClass}>Caregiver</span>
    </Link>
  );
}
