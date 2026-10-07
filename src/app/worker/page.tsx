import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  CertificationManager,
  WorkerProfileForm,
  type CertificationItem,
  type WorkerProfileInitial,
} from "@/components/WorkerPortal";

export const metadata: Metadata = {
  title: "Worker portal",
  robots: { index: false },
};

export default async function WorkerPortalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Middleware guards /worker on the edge (JWT only); requireSession re-checks
  // the database so a revoked, deleted or suspended account can never render
  // a portal — it lands on /login or the cookie-clearing escape hatch instead.
  const user = await requireSession("/worker");

  const sp = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: {
      caretakerDetails: {
        include: { certifications: { orderBy: { issuedAt: "desc" } } },
      },
    },
  });

  const details = profile?.caretakerDetails;

  const initial: WorkerProfileInitial = {
    fullName: profile?.fullName ?? user.name ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    hourlyRate: details?.hourlyRate ?? 15,
    yearsExperience: details?.yearsExperience ?? 0,
    skillsSummary: details?.skillsSummary ?? "",
    hasFirstAid: details?.hasFirstAid ?? false,
    isCertifiedMassage: details?.isCertifiedMassage ?? false,
  };

  const certifications: CertificationItem[] = (details?.certifications ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    documentUrl: c.documentUrl,
    issuedAt: c.issuedAt ? c.issuedAt.toISOString().slice(0, 10) : "",
  }));

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Worker portal</h1>
          <p className="mt-1 text-muted">
            Update your KES rates, skills and credentials — clients see your changes instantly in
            the directory.
          </p>
        </div>
        {profile && (
          <Link href={`/caretakers/${profile.id}`} className="btn btn-secondary">
            View my public profile ↗
          </Link>
        )}
      </div>

      {sp.saved && <p className="field-ok mb-4">✓ Profile saved — your directory listing is updated.</p>}
      {sp.cert === "added" && (
        <p className="field-ok mb-4">✓ Certification uploaded to your profile.</p>
      )}
      {sp.cert === "removed" && (
        <p className="field-ok mb-4">✓ Certification removed from your profile.</p>
      )}
      {sp.cert === "missing" && (
        <p className="field-error mb-4">That certification no longer exists.</p>
      )}
      {sp.cert === "forbidden" && (
        <p className="field-error mb-4">You can only remove your own certifications.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkerProfileForm initial={initial} />
        <CertificationManager certifications={certifications} />
      </div>
    </div>
  );
}
