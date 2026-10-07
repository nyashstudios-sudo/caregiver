import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "About Us — Kenya's Home Care & Management Platform",
  description:
    "Caregiver is a Nairobi-born platform connecting Kenyan families with verified caretakers, nannies, home managers and wellness professionals — transparent KES rates, real certificates.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    icon: "🛡️",
    title: "Proof over promises",
    body: "Anyone can claim to be certified. On Caregiver, the certificate itself sits on the profile — openable, dated and real.",
  },
  {
    icon: "🇰🇪",
    title: "Built for Kenya",
    body: "KES pricing, Kenyan neighbourhoods, phone-number login and booking flows shaped around how families here actually hire.",
  },
  {
    icon: "🤝",
    title: "Dignity for care workers",
    body: "Caregivers set their own rates, showcase their skills and meet clients who already respect their credentials.",
  },
  {
    icon: "🔒",
    title: "Safety first",
    body: "Role-based accounts, protected data under Kenya's Data Protection Act, 2019, and a clear audit trail on every booking.",
  },
];

export default async function AboutPage() {
  const [workerCount, clientCount, bookingCount, credentialCount] = await Promise.all([
    prisma.user.count({ where: { role: "WORKER" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.booking.count(),
    prisma.certification.count(),
  ]).catch(() => [0, 0, 0, 0] as [number, number, number, number]);

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">About us</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Care done right, from Nairobi outward
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Caregiver was born from a simple frustration: hiring care in Kenya runs on rumours and
          handshakes. We rebuilt it on evidence — real certificates, transparent KES rates and a
          booking trail both sides can trust.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Caretakers listed", value: workerCount },
          { label: "Clients served", value: clientCount },
          { label: "Bookings handled", value: bookingCount },
          { label: "Verified credentials", value: credentialCount },
        ].map((stat) => (
          <div key={stat.label} className="card p-5 text-center">
            <p className="text-3xl font-extrabold text-brand sm:text-4xl">{stat.value}</p>
            <p className="mt-1 text-sm font-medium text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Story */}
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Our story</h2>
          <p className="prose-bio mt-3">
            In Nairobi, most families still find caretakers through word of mouth — and most
            caretakers find work the same way. It works until it doesn&apos;t: unverified claims,
            unclear rates, and no record of what was actually agreed.
          </p>
          <p className="prose-bio mt-3">
            We started Caregiver to give both sides a fair marketplace. Clients see who they are
            hiring — skills, experience, location, rate and the actual certificate documents.
            Caregivers get a professional profile that does the talking before the interview.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Where we are today</h2>
          <p className="prose-bio mt-3">
            Caregivers from Kilimani to Kisumu list their services on the platform — nannies, elder
            caregivers, home managers, massage therapists and more. Bookings move through a clear
            status flow, credentials are one tap away, and every rate is published in shillings.
          </p>
          <p className="prose-bio mt-3">
            We are just getting started: more towns, more categories and more tools for care
            professionals across Kenya.
          </p>
        </section>
      </div>

      {/* Values */}
      <div className="mt-12">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">What we stand for</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title} className="card p-6">
              <div className="mb-3 text-3xl" aria-hidden>
                {value.icon}
              </div>
              <h3 className="mb-1.5 font-bold text-ink">{value.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{value.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="card mt-12 flex flex-col items-center gap-4 bg-linear-to-br from-brand to-brand-strong p-8 text-center sm:p-10">
        <h2 className="text-2xl font-extrabold text-white">Join the platform</h2>
        <p className="max-w-xl text-white/85">
          Whether you need care at home or you provide it — there is a place for you on Caregiver.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/signup?role=CLIENT"
            className="btn bg-white px-6 py-3 text-base text-brand-strong hover:bg-white/90 dark:text-[#04231f]"
          >
            Hire a caretaker
          </Link>
          <Link
            href="/signup?role=WORKER"
            className="btn border border-white/60 px-6 py-3 text-base text-white hover:bg-white/10"
          >
            Offer care services
          </Link>
        </div>
      </div>
    </div>
  );
}
