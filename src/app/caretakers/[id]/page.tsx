import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { SkillBadges } from "@/components/Badges";
import { BookingForm } from "@/components/BookingForm";
import { formatKESRate, formatKES } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await prisma.profile.findFirst({
    where: { id, user: { role: "WORKER", status: "ACTIVE" } },
    include: { caretakerDetails: { include: { certifications: true } } },
  });
  if (!profile?.caretakerDetails) return { title: "Caretaker not found" };

  return {
    title: `${profile.fullName} — caretaker profile in ${profile.location}`,
    description: `Hire ${profile.fullName} in ${profile.location}. ${profile.caretakerDetails.yearsExperience} years experience, KES ${Math.round(profile.caretakerDetails.hourlyRate)}/hr, ${profile.caretakerDetails.certifications.length} verified credential${profile.caretakerDetails.certifications.length === 1 ? "" : "s"}. Read reviews and book with confidence.`,
    alternates: { canonical: `/caretakers/${profile.id}` },
  };
}

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
    where: { id, user: { role: "WORKER", status: "ACTIVE" } },
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

  const canMessage = !!user && user.id !== profile.userId;
  const completedJobs = await prisma.booking.count({
    where: { workerId: profile.userId, status: "COMPLETED" },
  });
  const [listedServices, portfolioItems] = await Promise.all([
    prisma.service.findMany({
      where: { workerId: profile.userId, active: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.portfolioItem.findMany({
      where: { workerId: profile.userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 9,
    }),
  ]);

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
            {profile.verifiedAt ? (
              <span className="badge bg-teal-400/20 text-teal-200">✓ Vetted by Caregiver</span>
            ) : (
              <span className="badge bg-amber-400/20 text-amber-200">Vetting in progress</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              📍 {profile.location}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {details.yearsExperience} yrs experience
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-400/25 px-3 py-1 text-xs font-bold text-teal-100">
              {formatKESRate(details.hourlyRate)}
            </span>
            {completedJobs > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                ⭐ {completedJobs} completed job{completedJobs === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <SkillBadges
              hasFirstAid={details.hasFirstAid}
              isCertifiedMassage={details.isCertifiedMassage}
            />
            <span className="badge bg-white/15 text-white">
              {details.certifications.filter((c) => c.status === "APPROVED").length}/
              {details.certifications.length} credential
              {details.certifications.length === 1 ? "" : "s"} approved
            </span>
          </div>
          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            {canMessage && (
              <Link href={`/messages/${profile.userId}`} className="btn btn-secondary !border-white/30 !bg-white/10 !text-white hover:!bg-white/20">
                ✉️ Message {profile.fullName.split(" ")[0]}
              </Link>
            )}
            {user?.role === "CLIENT" && (
              <a href="#booking" className="btn btn-primary w-full max-w-xs sm:w-auto">
                Request booking
              </a>
            )}
          </div>
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
                    <div key={skill} className="dl-row">
                      <span className="text-sm font-medium text-ink">{skill}</span>
                      <span className="text-sm font-bold text-brand">
                        {formatKESRate(details.hourlyRate)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="dl-row">
                    <span className="text-sm font-medium text-ink">General care services</span>
                    <span className="text-sm font-bold text-brand">
                      {formatKESRate(details.hourlyRate)}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Fixed-price listings — book in one tap */}
            {listedServices.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-ink">Ready-to-book services</h2>
                  <Link
                    href="/services"
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    All services →
                  </Link>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {listedServices.map((svc) => (
                    <li key={svc.id}>
                      <Link
                        href={`/services/${svc.slug}`}
                        className="card block h-full p-4 transition hover:border-brand"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold leading-snug text-ink">{svc.title}</p>
                          <span className="shrink-0 font-extrabold text-brand">
                            {formatKES(svc.priceKes)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{svc.description}</p>
                        {svc.durationLabel && (
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                            {svc.durationLabel}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Portfolio — proof of past work */}
            {portfolioItems.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-ink">Previous work</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {portfolioItems.map((item) => (
                    <figure key={item.id} className="overflow-hidden rounded-xl border border-line">
                      {item.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.mediaUrl}
                          alt={item.title}
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="grid aspect-square w-full place-items-center bg-brand-soft text-3xl">
                          🧩
                        </div>
                      )}
                      <figcaption className="p-2.5">
                        <p className="line-clamp-1 text-xs font-bold text-ink">{item.title}</p>
                        <p className="line-clamp-1 text-[11px] text-muted">
                          {[item.clientName, item.location].filter(Boolean).join(" · ") ||
                            item.category ||
                            ""}
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

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
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">{cert.title}</p>
                          <span
                            className={`badge ${
                              cert.status === "APPROVED"
                                ? "badge-green"
                                : cert.status === "REJECTED"
                                  ? "badge-red"
                                  : "badge-amber"
                            }`}
                          >
                            {cert.status === "APPROVED"
                              ? "✓ Approved"
                              : cert.status === "REJECTED"
                                ? "Rejected"
                                : "In review"}
                          </span>
                        </div>
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
            {canMessage && (
              <div className="card p-5">
                <p className="mb-1 font-bold text-ink">Questions for {profile.fullName.split(" ")[0]}?</p>
                <p className="mb-3 text-sm text-muted">
                  Message directly — most caretakers reply within a few hours.
                </p>
                <Link href={`/messages/${profile.userId}`} className="btn btn-primary w-full">
                  ✉️ Send a message
                </Link>
              </div>
            )}
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
