import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { SkillBadges } from "@/components/Badges";
import { BookingForm } from "@/components/BookingForm";
import { formatKESRate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Caretaker profile",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function CaretakerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await prisma.profile.findFirst({
    where: { id, user: { role: "WORKER" } },
    include: {
      caretakerDetails: {
        include: { certifications: { orderBy: { issuedAt: "desc" } } },
      },
    },
  });

  if (!profile?.caretakerDetails) notFound();

  const user = await getSessionUser();
  const details = profile.caretakerDetails;
  const skills = (details.skillsSummary || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <div className="container-page py-6 sm:py-8">
      <Link
        href="/caretakers"
        className="mb-5 inline-block text-sm font-medium text-muted transition hover:text-ink"
      >
        ← Back to caretakers
      </Link>

      {/* Profile hero — dark panel per the mobile mock */}
      <div className="card overflow-hidden">
        <div className="bg-navy px-5 py-8 text-center text-white sm:py-10">
          <Avatar
            src={profile.avatarUrl}
            name={profile.fullName}
            size={104}
            className="mx-auto ring-4 ring-white/20"
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{profile.fullName}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              📍 {profile.location}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {details.yearsExperience} yrs experience
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {formatKESRate(details.hourlyRate)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <SkillBadges
              hasFirstAid={details.hasFirstAid}
              isCertifiedMassage={details.isCertifiedMassage}
            />
            <span className="badge bg-white/15 text-white">
              {details.certifications.length} credential
              {details.certifications.length === 1 ? "" : "s"} on file
            </span>
          </div>
          {user?.role === "CLIENT" && (
            <a
              href="#booking"
              className="btn btn-primary mt-5 w-full max-w-xs sm:hidden"
            >
              Request booking
            </a>
          )}
        </div>

        {/* Body */}
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section>
              <h2 className="mb-2 text-lg font-bold text-ink">About me</h2>
              <p className="prose-bio">
                {profile.bio || "This caretaker has not written a bio yet."}
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">Services &amp; rates</h2>
              <div className="card divide-y divide-line">
                {skills.length > 0 ? (
                  skills.map((skill) => (
                    <div key={skill} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-ink">{skill}</span>
                      <span className="text-sm font-bold text-brand">
                        {formatKESRate(details.hourlyRate)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-ink">General care services</span>
                    <span className="text-sm font-bold text-brand">
                      {formatKESRate(details.hourlyRate)}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">Verification credentials</h2>
              {details.certifications.length === 0 ? (
                <p className="text-sm text-muted">No credentials uploaded yet.</p>
              ) : (
                <ul className="card divide-y divide-line">
                  {details.certifications.map((cert) => (
                    <li
                      key={cert.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-ink">{cert.title}</p>
                        <p className="text-xs text-muted">Issued {formatDate(cert.issuedAt)}</p>
                      </div>
                      <a
                        href={cert.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                      >
                        View document ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5" id="booking">
            {user?.role === "CLIENT" ? (
              <BookingForm workerId={profile.userId} workerName={profile.fullName} />
            ) : user ? (
              <div className="card p-5 text-sm text-muted">
                <p className="mb-2 font-bold text-ink">Booking</p>
                <p>
                  Only client accounts can book caretakers. Your account is signed in as{" "}
                  <span className="badge badge-slate">{user.role}</span>.
                </p>
              </div>
            ) : (
              <div className="card p-5 text-sm text-muted">
                <p className="mb-2 font-bold text-ink">
                  Want to book {profile.fullName.split(" ")[0]}?
                </p>
                <p className="mb-4">Sign in with a client account to send a booking request.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/login" className="btn btn-primary">
                    Sign in
                  </Link>
                  <Link href="/signup?role=CLIENT" className="btn btn-secondary">
                    Create client account
                  </Link>
                </div>
              </div>
            )}

            <div className="card p-5 text-sm text-muted">
              <p className="mb-3 font-bold text-ink">Quick facts</p>
              <ul className="space-y-2">
                <li>⏱️ {details.yearsExperience} years of experience</li>
                <li>💵 {formatKESRate(details.hourlyRate)}</li>
                <li>📍 {profile.location}</li>
                <li>
                  🛡️{" "}
                  {details.hasFirstAid
                    ? "First-aid certified"
                    : "No first-aid certification yet"}
                </li>
                <li>
                  💆{" "}
                  {details.isCertifiedMassage
                    ? "Certified massage therapist"
                    : "No massage certification"}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
