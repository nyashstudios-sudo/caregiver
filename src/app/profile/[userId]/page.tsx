import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { SkillBadges } from "@/components/Badges";
import { formatKESRate, formatKES } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      profile: { select: { fullName: true, location: true } },
    },
  });
  if (!user || user.role === "ADMIN" || user.status === "SUSPENDED") {
    return { title: "Profile" };
  }
  const name = user.profile?.fullName ?? "Caregiver member";
  const where = user.profile?.location ? ` in ${user.profile.location}` : "";
  return {
    title: `${name} — ${user.role === "WORKER" ? "caretaker" : "client"} profile${where}`,
    description: `${name}’s public Caregiver profile${where}. Reviews, credentials and booking history on Kenya’s home care platform.`,
    alternates: { canonical: `/profile/${userId}` },
  };
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating.toFixed(1)} out of 5 stars`} className="text-amber-500">
      {"★".repeat(Math.round(rating))}
      <span className="text-line">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Client",
  WORKER: "Caretaker",
  ADMIN: "Caregiver team",
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const me = await getSessionUser();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      profile: {
        include: {
          caretakerDetails: { include: { certifications: true } },
        },
      },
      wallet: { select: { balance: true } },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          author: {
            select: {
              id: true,
              role: true,
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
          booking: { select: { serviceDate: true } },
        },
      },
      _count: { select: { reviewsReceived: true, clientBookings: true, workerBookings: true } },
    },
  });

  // Admins have no public profile page (privacy), everything else is public.
  if (!user || user.role === "ADMIN") notFound();
  // Suspended accounts are hidden from the public web entirely.
  if (user.status === "SUSPENDED" && me?.role !== "ADMIN") notFound();

  const profile = user.profile;
  const details = profile?.caretakerDetails;
  const isSelf = me?.id === user.id;

  const agg = await prisma.review.aggregate({
    where: { targetId: user.id },
    _avg: { rating: true },
    _count: true,
  });
  const average = agg._avg.rating ?? 0;
  const reviewCount = agg._count;

  const completedAsWorker = await prisma.booking.count({
    where: { workerId: user.id, status: "COMPLETED" },
  });

  const name = profile?.fullName ?? "Caregiver user";
  const skills = (details?.skillsSummary || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description: profile?.bio || undefined,
    image: profile?.avatarUrl || undefined,
    ...(user.role === "WORKER" && details
      ? {
          jobTitle: "Caretaker",
          worksFor: { "@type": "Organization", name: "Caregiver Kenya" },
          address: profile?.location
            ? { "@type": "PostalAddress", addressLocality: profile.location, addressCountry: "KE" }
            : undefined,
        }
      : {}),
    aggregateRating:
      reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: average.toFixed(1),
            reviewCount,
          }
        : undefined,
  };

  return (
    <div className="container-page py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      {/* Hero */}
      <div className="page-hero-navy mb-6">
        <div className="relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar
            src={profile?.avatarUrl}
            name={name}
            size={96}
            className="ring-4 ring-white/20"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{name}</h1>
              <span className="badge bg-white/15 text-white">{ROLE_LABEL[user.role]}</span>
              {user.status === "SUSPENDED" && (
                <span className="badge bg-red-500/30 text-red-200">Suspended</span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/75">
              {profile?.location ? `📍 ${profile.location} · ` : ""}
              Joined {formatDate(user.createdAt)}
              {user.lastLoginAt && ` · Active ${formatDate(user.lastLoginAt)}`}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {reviewCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                  <Stars rating={average} />
                  <span className="text-white">
                    {average.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? "" : "s"})
                  </span>
                </span>
              ) : (
                <span className="text-sm text-white/60">No reviews yet</span>
              )}
              {user.role === "WORKER" && completedAsWorker > 0 && (
                <span className="badge bg-teal-400/25 text-teal-100">
                  ⭐ {completedAsWorker} completed job{completedAsWorker === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {details && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <SkillBadges
                  hasFirstAid={details.hasFirstAid}
                  isCertifiedMassage={details.isCertifiedMassage}
                />
                <span className="badge bg-white/15 text-white">
                  {details.certifications.length} credential
                  {details.certifications.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {isSelf && (
              <Link href="/account" className="btn btn-primary">
                Edit my profile
              </Link>
            )}
            {!isSelf && me && (
              <Link href={`/messages/${user.id}`} className="btn btn-primary">
                ✉️ Message
              </Link>
            )}
            {!isSelf && !me && (
              <Link href="/login" className="btn btn-primary">
                Sign in to message
              </Link>
            )}
            {user.role === "WORKER" && details && (
              <Link
                href={`/caretakers/${profile?.id}`}
                className="btn btn-secondary !border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
              >
                Full caretaker page →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: about + services */}
        <div className="space-y-6 lg:col-span-2">
          {profile?.bio && (
            <section className="card p-5">
              <h2 className="mb-2 text-lg font-bold text-ink">About</h2>
              <p className="prose-bio">{profile.bio}</p>
            </section>
          )}

          {details && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-bold text-ink">Services &amp; rates</h2>
              <div className="divide-y divide-line">
                {(skills.length > 0 ? skills : ["General care services"]).map((skill) => (
                  <div key={skill} className="dl-row">
                    <span className="text-sm font-medium text-ink">{skill}</span>
                    <span className="text-sm font-bold text-brand">
                      {formatKESRate(details.hourlyRate)}
                    </span>
                  </div>
                ))}
                <div className="dl-row">
                  <span className="text-sm font-medium text-ink">Experience</span>
                  <span className="text-sm font-bold text-ink">
                    {details.yearsExperience} years
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Reviews */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Reviews</h2>
              {reviewCount > 0 && (
                <span className="text-sm font-semibold text-muted">
                  {average.toFixed(1)} / 5 · {reviewCount}
                </span>
              )}
            </div>
            {user.reviewsReceived.length === 0 ? (
              <p className="text-sm text-muted">
                No reviews yet — reviews appear after completed bookings.
              </p>
            ) : (
              <ul className="space-y-4">
                {user.reviewsReceived.map((review) => (
                  <li key={review.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={review.author.profile?.avatarUrl}
                        name={review.author.profile?.fullName ?? "User"}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/profile/${review.author.id}`}
                            className="font-semibold text-ink hover:text-brand"
                          >
                            {review.author.profile?.fullName ?? "Caregiver user"}
                          </Link>
                          <span className="badge badge-slate">{ROLE_LABEL[review.author.role]}</span>
                          <Stars rating={review.rating} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDate(review.createdAt)}
                          {review.booking && ` · job on ${formatDate(review.booking.serviceDate)}`}
                        </p>
                        {review.comment && (
                          <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            “{review.comment}”
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar: stats */}
        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 font-bold text-ink">Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Rating</span>
                <span className="font-bold text-ink">
                  {reviewCount > 0 ? `${average.toFixed(1)} ★` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Reviews</span>
                <span className="font-bold text-ink">{user._count.reviewsReceived}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Jobs completed</span>
                <span className="font-bold text-ink">{completedAsWorker}</span>
              </div>
              {user.role === "CLIENT" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Bookings made</span>
                  <span className="font-bold text-ink">{user._count.clientBookings}</span>
                </div>
              )}
              {user.role === "WORKER" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Booking requests</span>
                  <span className="font-bold text-ink">{user._count.workerBookings}</span>
                </div>
              )}
              {user.role === "WORKER" && details && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Hourly rate</span>
                  <span className="font-bold text-brand">
                    {formatKESRate(details.hourlyRate)}
                  </span>
                </div>
              )}
              {isSelf && user.wallet && (
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-sm text-muted">Wallet balance</span>
                  <span className="font-bold text-ink">{formatKES(user.wallet.balance)}</span>
                </div>
              )}
            </div>
          </div>

          {user.role === "WORKER" && details && details.certifications.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 font-bold text-ink">Credentials</h3>
              <ul className="space-y-2">
                {details.certifications.map((cert) => (
                  <li key={cert.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">{cert.title}</span>
                    <a
                      href={cert.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      View ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {user.role === "WORKER" && me?.role === "CLIENT" && details && (
            <Link
              href={`/caretakers/${profile?.id}`}
              className="btn btn-navy w-full"
            >
              Book {name.split(" ")[0]}
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
