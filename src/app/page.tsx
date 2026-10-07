import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SkillBadges } from "@/components/Badges";
import { WorkerCard } from "@/components/WorkerCard";
import { CATEGORIES } from "@/lib/categories";
import { formatKES } from "@/lib/format";

export const metadata: Metadata = {
  title: "Caregiver — Hire Verified Caretakers in Kenya | Home Care & Management",
  description:
    "Kenya's home care & management platform. Browse verified nannies, elder caregivers, home managers and massage therapists in Nairobi, Mombasa, Kisumu and beyond — with transparent KES rates and real certificates.",
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    n: "1",
    title: "Create your free account",
    body: "Sign up as a client to hire, or as a worker to showcase your skills and certificates.",
  },
  {
    n: "2",
    title: "Discover & book",
    body: "Filter by location, category and max KES rate, then send a booking request in seconds.",
  },
  {
    n: "3",
    title: "Accept & deliver",
    body: "The caretaker accepts, the job happens, and both sides track PENDING → ACCEPTED → COMPLETED.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We found a first-aid certified nanny in Kilimani within a day. Seeing her actual certificate before booking made all the difference.",
    name: "Jane D.",
    role: "Parent, Kilimani — Nairobi",
  },
  {
    quote:
      "As a house manager, the platform brings me serious clients who already trust my uploaded credentials. My calendar stays full.",
    name: "Sarah N.",
    role: "House manager, Karen — Nairobi",
  },
  {
    quote:
      "I needed elder care for my grandfather while I travel for work. Transparent KES rates and a clear booking trail — no more hand-hand agreements.",
    name: "Brian O.",
    role: "Grandson, Westlands — Nairobi",
  },
];

const FAQ_PREVIEW = [
  {
    q: "How much does a caregiver cost in Kenya?",
    a: "Hourly help typically costs KES 400–900, while certified specialisations such as first aid and massage run KES 900–1,500 per hour. Every profile shows its rate up front.",
  },
  {
    q: "Are the certificates on profiles verified?",
    a: "Caregivers upload their actual documents — first-aid cards, CPR cards and massage diplomas — which you can open and read on their profile before you book.",
  },
  {
    q: "How do bookings work?",
    a: "You send a request with a date and notes. It starts as PENDING, the caretaker accepts it (ACCEPTED), and after the job it is marked COMPLETED. Either side can cancel before then.",
  },
  {
    q: "Which towns do you cover?",
    a: "Caregivers are listed across Kenya — Nairobi (Kilimani, Westlands, Karen, Lavington), Mombasa, Kisumu, Nakuru, Eldoret and more.",
  },
];

export default async function HomePage() {
  const [featured, latestPosts, workerCount, bookingCount] = await Promise.all([
    prisma.profile.findMany({
      where: { user: { role: "WORKER" }, caretakerDetails: { isNot: null } },
      include: { caretakerDetails: { include: { certifications: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.user.count({ where: { role: "WORKER" } }),
    prisma.booking.count(),
  ]).catch(() => [[], [], 0, 0] as const);

  const anyWorker = featured[0];

  return (
    <>
      {/* ── Hero (teal panel per mobile mock) ─────────────────────────── */}
      <section className="bg-linear-to-br from-brand via-brand to-brand-strong dark:from-brand-strong dark:via-[#0b7f76] dark:to-[#0a5c56]">
        <div className="container-page py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80 dark:text-[#9ff3e7]">
              Kenya&apos;s home care &amp; management platform
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Find trusted caretakers for your home &amp; family
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              Verified nannies, elder caregivers, home managers and wellness professionals across
              Nairobi and Kenya — with real certificates you can open and transparent KES rates.
            </p>

            {/* Search bar */}
            <form action="/caretakers" method="get" className="mt-7 max-w-xl">
              <label htmlFor="hero-q" className="sr-only">
                Search for caregivers
              </label>
              <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-lg dark:bg-surface">
                <input
                  id="hero-q"
                  name="q"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-0"
                  placeholder="Search caregivers (e.g. “Nanny Nairobi”, “First Aid”)"
                />
                <button
                  type="submit"
                  className="btn btn-navy shrink-0 px-5"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/signup?role=CLIENT"
                className="btn bg-white px-5 py-3 text-base text-brand-strong hover:bg-white/90 dark:text-[#04231f]"
              >
                Hire a caretaker
              </Link>
              <Link
                href="/signup?role=WORKER"
                className="btn border border-white/60 px-5 py-3 text-base text-white hover:bg-white/10"
              >
                Offer care services
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/85">
              <span>
                <strong className="text-white">{workerCount}</strong> caretakers listed
              </span>
              <span>
                <strong className="text-white">{bookingCount}</strong> bookings handled
              </span>
              <span className="flex items-center gap-2">
                <SkillBadges hasFirstAid isCertifiedMassage />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category chips ────────────────────────────────────────────── */}
      <section className="container-page -mt-7 relative z-10">
        <div className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/caretakers?category=${category.id}`}
              className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 p-4 text-center transition hover:bg-brand-soft"
            >
              <span className="text-2xl" aria-hidden>
                {category.icon}
              </span>
              <span className="text-sm font-bold text-ink">{category.label}</span>
              <span className="hidden text-xs text-muted sm:block">{category.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured listings ─────────────────────────────────────────── */}
      <section className="container-page py-10 sm:py-14">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Featured listings</p>
            <h2 className="mt-1 section-title">Available caretakers near you</h2>
          </div>
          <Link href="/caretakers" className="btn btn-secondary shrink-0">
            View all →
          </Link>
        </div>

        {anyWorker ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((profile) => (
              <WorkerCard
                key={profile.id}
                worker={{
                  id: profile.id,
                  fullName: profile.fullName,
                  location: profile.location,
                  avatarUrl: profile.avatarUrl,
                  bio: profile.bio,
                  details: profile.caretakerDetails!,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-muted">
            No caretakers listed yet —{" "}
            <Link href="/signup?role=WORKER" className="font-semibold text-brand">
              be the first to join
            </Link>
            .
          </div>
        )}
      </section>

      {/* ── Why verified ──────────────────────────────────────────────── */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Why Caregiver</p>
            <h2 className="mt-1 section-title">Hire with evidence, not hope</h2>
            <p className="mt-3 text-muted">
              In Kenya&apos;s informal care market, anyone can claim to be certified. We make the
              proof part of the profile.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🛡️",
                title: "Openable certificates",
                body: "First-aid cards, CPR cards and massage diplomas are uploaded as documents you can actually open and read.",
              },
              {
                icon: "🇰🇪",
                title: "Built for Kenya",
                body: "KES rates, Kenyan locations from Kilimani to Kisumu, and booking flows that fit how Kenyan families hire.",
              },
              {
                icon: "📅",
                title: "Clear booking trail",
                body: "PENDING → ACCEPTED → COMPLETED with dates and notes on both sides. No more disputes over what was agreed.",
              },
              {
                icon: "💡",
                title: "Transparent pricing",
                body: "Every profile shows an hourly rate in KES — compare, shortlist and book without awkward negotiations.",
              },
            ].map((feature) => (
              <div key={feature.title} className="card p-5">
                <div className="mb-3 text-3xl" aria-hidden>
                  {feature.icon}
                </div>
                <h3 className="mb-1.5 font-bold text-ink">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-1 section-title">Three steps to trusted care</h2>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="card p-6 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-black text-white dark:text-[#04231f]">
                {step.n}
              </div>
              <h3 className="mb-2 font-bold text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Loved across Kenya</p>
            <h2 className="mt-1 section-title">Families &amp; caregivers on Caregiver</h2>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="card flex flex-col gap-3 p-6">
                <div className="text-brand" aria-hidden>
                  ★★★★★
                </div>
                <blockquote className="text-sm leading-relaxed text-muted">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-auto">
                  <p className="font-bold text-ink">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ preview ───────────────────────────────────────────────── */}
      <section className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-1 section-title">Questions, answered</h2>
          </div>
          <div className="mt-6 space-y-3">
            {FAQ_PREVIEW.map((item) => (
              <details key={item.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-bold text-ink marker:hidden">
                  <span className="float-right text-brand transition group-open:rotate-45">+</span>
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-5 text-center">
            <Link href="/faq" className="btn btn-secondary">
              Read all FAQs →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Blog preview ──────────────────────────────────────────────── */}
      {latestPosts.length > 0 && (
        <section className="bg-surface py-12 sm:py-16">
          <div className="container-page">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">From the blog</p>
                <h2 className="mt-1 section-title">Care guides &amp; Kenyan insights</h2>
              </div>
              <Link href="/blog" className="btn btn-secondary shrink-0">
                All posts →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="card group flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="eyebrow">{post.category ?? "Guides"}</span>
                  <h3 className="font-bold leading-snug text-ink group-hover:text-brand">
                    {post.title}
                  </h3>
                  <p className="line-clamp-3 text-sm text-muted">{post.excerpt}</p>
                  <span className="mt-auto pt-2 text-sm font-semibold text-brand">
                    Read article →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="container-page py-12 sm:py-16">
        <div className="card overflow-hidden border-0 bg-linear-to-br from-brand to-brand-strong p-8 text-center sm:p-12">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Join thousands of Kenyan families and care professionals — create an account today and
            send your first booking request in minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="btn bg-white px-6 py-3 text-base text-brand-strong hover:bg-white/90 dark:text-[#04231f]"
            >
              Create a free account
            </Link>
            <Link
              href="/caretakers"
              className="btn border border-white/60 px-6 py-3 text-base text-white hover:bg-white/10"
            >
              Browse {formatKES(400)}+/hr caregivers
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
