"use client";

/** Light/dark toggle. Initial theme is applied by an inline script in the layout. */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.toggle("dark") ? "dark" : "light";
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle light / dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:bg-surface-2"
    >
      {/* Sun (shown in light mode) */}
      <svg
        className="theme-icon-sun h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Moon (shown in dark mode) */}
      <svg
        className="theme-icon-moon h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
  );
}
