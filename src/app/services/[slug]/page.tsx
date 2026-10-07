import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { BookingForm } from "@/components/BookingForm";
import { formatKES } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

async function getService(slug: string) {
  return prisma.service.findFirst({
    where: { slug, active: true },
    include: {
      worker: {
        select: {
          id: true,
          role: true,
          profile: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              location: true,
              bio: true,
              verifiedAt: true,
              caretakerDetails: { select: { hourlyRate: true, yearsExperience: true } },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: "Service not found", robots: { index: false } };

  const workerName = service.worker.profile?.fullName ?? "a Caregiver professional";
  const where = service.worker.profile?.location ? ` in ${service.worker.profile.location}` : "";
  return {
    title: `${service.title} — KES ${service.priceKes.toLocaleString("en-GB")} by ${workerName}`,
    description: `${service.description.slice(0, 155)} Book ${service.title.toLowerCase()}${where} on Caregiver Kenya — fixed KES price, verified caregiver.`,
    alternates: { canonical: `/services/${service.slug}` },
    keywords: [service.title, service.category, "caregiver Kenya", `caretaker ${service.category}`],
  };
}

export default async function ServiceDetailPage({ params }: Params) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  const me = await getSessionUser();
  const profile = service.worker.profile;
  const name = profile?.fullName ?? "Caregiver professional";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    category: service.category,
    provider: {
      "@type": "Person",
      name,
      address: profile?.location
        ? { "@type": "PostalAddress", addressLocality: profile.location, addressCountry: "KE" }
        : undefined,
    },
    offers: {
      "@type": "Offer",
      price: service.priceKes,
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-6 text-sm text-muted">
        <Link href="/services" className="font-semibold text-brand hover:underline">
          ← Services
        </Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Offer */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="badge badge-teal">{service.category}</span>
              {service.durationLabel && <span className="badge badge-slate">{service.durationLabel}</span>}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {service.title}
            </h1>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-ink/90">
              {service.description}
            </p>
          </div>

          {/* Worker */}
          <div className="card flex flex-wrap items-center gap-4 p-5">
            <Avatar src={profile?.avatarUrl} name={name} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-ink">{name}</h2>
                {profile?.verifiedAt && (
                  <span className="badge badge-green">✓ Vetted by Caregiver</span>
                )}
              </div>
              <p className="text-sm text-muted">
                {profile?.location}
                {profile?.caretakerDetails
                  ? ` · ${profile.caretakerDetails.yearsExperience} yrs experience · ${formatKES(profile.caretakerDetails.hourlyRate)}/hr for custom work`
                  : ""}
              </p>
              {profile?.bio && <p className="mt-1 line-clamp-2 text-sm text-muted">{profile.bio}</p>}
            </div>
            <div className="flex gap-2">
              {profile && (
                <Link href={`/profile/${service.worker.id}`} className="btn btn-secondary">
                  Full profile ↗
                </Link>
              )}
              {me && me.id !== service.worker.id && (
                <Link href={`/messages/${service.worker.id}`} className="btn btn-secondary">
                  ✉️ Ask
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Booking rail */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {me?.role === "CLIENT" ? (
            <BookingForm
              workerId={service.worker.id}
              workerName={name}
              service={{
                id: service.id,
                title: service.title,
                priceKes: service.priceKes,
                durationLabel: service.durationLabel,
              }}
            />
          ) : me ? (
            <div className="card p-5 text-center text-sm text-muted">
              Only client accounts can book services. Switch to a client account to continue.
            </div>
          ) : (
            <div className="card p-5 text-center">
              <p className="mb-3 font-bold text-ink">
                {formatKES(service.priceKes)} · fixed price
              </p>
              <p className="mb-4 text-sm text-muted">
                Sign up as a client to book this service — it takes a minute.
              </p>
              <Link href="/signup?role=CLIENT" className="btn btn-primary w-full">
                Book this service
              </Link>
              <Link
                href="/login"
                className="mt-2 block text-sm font-semibold text-brand hover:underline"
              >
                I already have an account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
