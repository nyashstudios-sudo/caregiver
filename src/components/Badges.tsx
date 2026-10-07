import type { BookingStatus } from "@prisma/client";

/** Verified-skill badges (readme §5): green for verified specializations. */
export function SkillBadges({
  hasFirstAid,
  isCertifiedMassage,
}: {
  hasFirstAid?: boolean | null;
  isCertifiedMassage?: boolean | null;
}) {
  if (!hasFirstAid && !isCertifiedMassage) return null;
  return (
    <>
      {hasFirstAid && (
        <span className="badge badge-green" title="Verified first-aid certification">
          ✓ First Aid Certified
        </span>
      )}
      {isCertifiedMassage && (
        <span className="badge badge-teal" title="Verified massage diploma">
          ✓ Professional Massage
        </span>
      )}
    </>
  );
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "badge badge-amber",
  ACCEPTED: "badge badge-teal",
  COMPLETED: "badge badge-green",
  CANCELLED: "badge badge-red",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={STATUS_STYLES[status]}>{status}</span>;
}
