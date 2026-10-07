import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WorkerCard } from "@/components/WorkerCard";
import { CATEGORIES, categoryCondition, findCategory } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Find Caretakers in Kenya — Nannies, Elder Care & Home Managers",
  description:
    "Search verified caregivers across Kenya by location, KES hourly rate and certified specialisations (first aid, professional massage). Nairobi, Mombasa, Kisumu, Nakuru and more.",
  alternates: { canonical: "/caretakers" },
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CaretakersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = single(sp.q).trim();
  const maxRateRaw = single(sp.maxRate).trim();
  const firstAid = ["on", "true", "1"].includes(single(sp.firstAid));
  const massage = ["on", "true", "1"].includes(single(sp.massage));
  const category = findCategory(single(sp.category) || undefined);
  const maxRate = Number(maxRateRaw);
  const hasFilters = Boolean(q || maxRateRaw || firstAid || massage || category);

  // Filter handlers (readme §4B): location, max hourly rate, verified specializations
  // plus Kenya-market service categories.
  const conditions: Prisma.ProfileWhereInput[] = [];
  if (q) {
    conditions.push({
      OR: [
        { location: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { caretakerDetails: { skillsSummary: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (maxRateRaw && Number.isFinite(maxRate) && maxRate >= 0) {
    conditions.push({ caretakerDetails: { hourlyRate: { lte: maxRate } } });
  }
  if (firstAid) conditions.push({ caretakerDetails: { hasFirstAid: true } });
  if (massage) conditions.push({ caretakerDetails: { isCertifiedMassage: true } });
  if (category) conditions.push(categoryCondition(category));

  const profiles = await prisma.profile.findMany({
    where: {
      user: { role: "WORKER" },
      caretakerDetails: { isNot: null },
      ...(conditions.length ? { AND: conditions } : {}),
    },
    include: {
      caretakerDetails: {
        include: { certifications: { select: { id: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <p className="eyebrow">Directory</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Find caretakers in Kenya
        </h1>
        <p className="mt-1 text-muted">
          Filter by location, KES hourly rate and verified specialisations — every profile shows
          its real certificates.
        </p>
      </div>

      {/* Category chips */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Link
          href="/caretakers"
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            !category
              ? "border-brand bg-brand text-white dark:text-[#04231f]"
              : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
          }`}
        >
          All services
        </Link>
        {CATEGORIES.map((item) => {
          const active = category?.id === item.id;
          return (
            <Link
              key={item.id}
              href={`/caretakers?category=${item.id}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-brand bg-brand text-white dark:text-[#04231f]"
                  : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
              }`}
            >
              <span aria-hidden>{item.icon}</span> {item.label}
            </Link>
          );
        })}
      </div>

      {/* Filter bar */}
      <form
        method="get"
        action="/caretakers"
        className="card mb-8 grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_12rem_auto_auto] lg:items-end"
      >
        {category && <input type="hidden" name="category" value={category.id} />}
        <div>
          <label className="label" htmlFor="q">
            Location or keyword
          </label>
          <input
            className="input"
            id="q"
            name="q"
            defaultValue={q}
            placeholder="e.g. Kilimani, Nairobi"
          />
        </div>
        <div>
          <label className="label" htmlFor="maxRate">
            Max rate (KES/hr)
          </label>
          <input
            className="input"
            id="maxRate"
            name="maxRate"
            type="number"
            min={0}
            step={50}
            defaultValue={maxRateRaw}
            placeholder="e.g. 800"
          />
        </div>
        <fieldset className="flex items-end gap-5 pb-3">
          <legend className="sr-only">Verified specializations</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="firstAid"
              value="on"
              defaultChecked={firstAid}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Has first aid
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="massage"
              value="on"
              defaultChecked={massage}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Certified massage
          </label>
        </fieldset>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1">
            Apply filters
          </button>
          {hasFilters && (
            <Link href="/caretakers" className="btn btn-secondary">
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className="mb-4 text-sm text-muted">
        <strong className="text-ink">{profiles.length}</strong> caregiver
        {profiles.length === 1 ? "" : "s"} found
        {category && <> in <strong className="text-ink">{category.label}</strong></>}
      </p>

      {profiles.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-bold text-ink">No caretakers match your filters</p>
          <p className="mt-1 text-sm text-muted">
            Try a wider location, a higher maximum KES rate, or clear the category.
          </p>
          <Link href="/caretakers" className="btn btn-secondary mt-4">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
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
      )}
    </div>
  );
}
