import Image from "next/image";

function initialsOf(name: string | null | undefined): string {
  const source = name?.trim() || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Profile photo with an initials fallback when no avatar has been uploaded. */
export function Avatar({
  src,
  name,
  size = 48,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name ? `${name}'s photo` : "Profile photo"}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-on-soft ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size / 2.6)) }}
      aria-hidden
    >
      {initialsOf(name)}
    </div>
  );
}
