import Link from "next/link";
import { Avatar } from "./Avatar";
import { SkillBadges } from "./Badges";
import { formatKES } from "@/lib/format";

export type WorkerCardData = {
  id: string;
  fullName: string;
  location: string;
  avatarUrl: string | null;
  bio: string | null;
  details: {
    hourlyRate: number;
    yearsExperience: number;
    hasFirstAid: boolean;
    isCertifiedMassage: boolean;
    skillsSummary: string | null;
    certifications: { id: string }[];
  };
};

/** Directory card for a caretaker listing (styled after the mobile mock). */
export function WorkerCard({ worker }: { worker: WorkerCardData }) {
  const { details } = worker;
  return (
    <Link
      href={`/caretakers/${worker.id}`}
      className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Avatar src={worker.avatarUrl} name={worker.fullName} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-ink group-hover:text-brand">
            {worker.fullName}
          </p>
          <p className="truncate text-sm text-muted">📍 {worker.location}</p>
        </div>
        <span className="badge badge-green shrink-0">{formatKES(details.hourlyRate)}/hr</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <SkillBadges
          hasFirstAid={details.hasFirstAid}
          isCertifiedMassage={details.isCertifiedMassage}
        />
        <span className="badge badge-slate">{details.yearsExperience} yrs experience</span>
        {details.certifications.length > 0 && (
          <span className="badge badge-slate">
            {details.certifications.length} credential
            {details.certifications.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-muted">
        {details.skillsSummary || worker.bio || "No bio provided yet."}
      </p>

      <span className="btn btn-navy mt-auto w-full group-hover:opacity-90">
        View profile &amp; book
      </span>
    </Link>
  );
}
