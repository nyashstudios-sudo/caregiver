import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { formatKES } from "@/lib/format";

export const metadata: Metadata = {
  title: "Book fixed-price care services in Kenya",
  description:
    "Browse ready-to-book care services in Kenya — house cleaning, deep cleans, massage sessions, babysitting shifts and elder care visits. Transparent KES prices, book in one tap.",
  alternates: { canonical: "/services" },
  keywords: [
    "care services Kenya",
    "book nanny Nairobi",
    "house cleaning service Nairobi",
    "massage at home Nairobi",
    "elder care service Kenya",
  ],
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = single(sp.q).trim();
  const category = single(sp.category).trim();

  const services = await prisma.service.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { category: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      worker: {
        select: {
          id: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              location: true,
              verifiedAt: true,
            },
          },
        },
      },
    },
  });

  const categories = await prisma.service.groupBy({
    by: ["category"],
    where: { active: true },
    _count: true,
  });

  return (
    <div className="container-page py-10">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">Marketplace</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Book a service, skip the haggling
        </h1>
        <p className="mt-2 text-muted">
          Caregivers publish fixed-price offers — you see exactly what you get and what it
          costs before you book.
        </p>
      </div>

      {/* Search + categories */}
      <form action="/services" method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search services (e.g. deep cleaning, massage)…"
          className="input max-w-md flex-1"
        />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        {(q || category) && (
          <Link href="/services" className="btn btn-secondary">
            Clear
          </Link>
        )}
      </form>

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.category}
              href={`/services?category=${encodeURIComponent(c.category)}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                category === c.category
                  ? "border-brand bg-brand text-white dark:text-[#04231f]"
                  : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {c.category} <span className="opacity-60">({c._count})</span>
            </Link>
          ))}
        </div>
      )}

      {services.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-bold text-ink">No services match that search</p>
          <p className="mt-1 text-sm text-muted">
            Try another keyword, or{" "}
            <Link href="/caretakers" className="font-semibold text-brand hover:underline">
              browse caretakers
            </Link>{" "}
            and request something custom.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <li key={svc.id}>
              <Link
                href={`/services/${svc.slug}`}
                className="card flex h-full flex-col p-5 transition hover:border-brand"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="badge badge-teal">{svc.category}</span>
                  <span className="text-lg font-extrabold text-brand">
                    {formatKES(svc.priceKes)}
                  </span>
                </div>
                <h2 className="font-bold leading-snug text-ink">{svc.title}</h2>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">{svc.description}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                  <Avatar
                    src={svc.worker.profile?.avatarUrl}
                    name={svc.worker.profile?.fullName ?? "Caregiver"}
                    size={30}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {svc.worker.profile?.fullName ?? "Caregiver"}
                    {svc.worker.profile?.verifiedAt && (
                      <span className="ml-1 text-teal-600" title="Vetted by Caregiver">
                        ✓
                      </span>
                    )}
                  </span>
                  {svc.durationLabel && (
                    <span className="shrink-0 text-xs text-muted">{svc.durationLabel}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
