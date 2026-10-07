import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Blog — Caregiver Guides: Pricing, Hiring & Home Care in Kenya",
  description:
    "Practical guides for Kenyan families and care professionals — caregiver rates in KES, hiring nannies in Nairobi, first aid basics, elder care and growing your care career.",
  alternates: { canonical: "/blog" },
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function readTime(content: string): number {
  return Math.max(1, Math.round(content.split(/\s+/).length / 200));
}

function Cover({ post, big }: { post: { coverImageUrl: string | null; category: string | null }; big?: boolean }) {
  if (post.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.coverImageUrl}
        alt=""
        className={`w-full rounded-xl object-cover ${big ? "h-56 sm:h-72" : "h-40"}`}
      />
    );
  }
  return (
    <div
      className={`flex w-full items-center justify-center rounded-xl bg-linear-to-br from-brand to-brand-strong ${big ? "h-56 sm:h-72" : "h-40"}`}
      aria-hidden
    >
      <span className="text-4xl font-black text-white/30">Caregiver</span>
    </div>
  );
}

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  const [featured, ...rest] = posts;

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Blog</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Care guides &amp; Kenyan insights
        </h1>
        <p className="mt-3 text-muted">
          Research-backed, experience-tested reading for families hiring care and professionals
          building care careers in Kenya — from KES rate benchmarks to first-aid basics.
        </p>
      </div>

      {!featured ? (
        <div className="card mt-10 p-10 text-center text-muted">
          No articles published yet — check back soon.
        </div>
      ) : (
        <>
          {/* Featured post */}
          <Link
            href={`/blog/${featured.slug}`}
            className="card group mt-10 grid gap-5 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 lg:grid-cols-2"
          >
            <Cover post={featured} big />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs">
                <span className="eyebrow">{featured.category ?? "Guides"}</span>
                <span className="text-muted">
                  {formatDate(featured.publishedAt)} · {readTime(featured.content)} min read
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-ink group-hover:text-brand sm:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                {featured.excerpt}
              </p>
              <span className="mt-4 font-semibold text-brand">Read article →</span>
            </div>
          </Link>

          {/* Grid */}
          {rest.length > 0 && (
            <>
              <h2 className="mt-12 mb-5 text-xl font-bold text-ink sm:text-2xl">
                Latest articles
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Cover post={post} />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="eyebrow">{post.category ?? "Guides"}</span>
                      <span className="text-muted">
                        {formatDate(post.publishedAt)} · {readTime(post.content)} min
                      </span>
                    </div>
                    <h3 className="font-bold leading-snug text-ink group-hover:text-brand">
                      {post.title}
                    </h3>
                    <p className="line-clamp-3 text-sm text-muted">{post.excerpt}</p>
                    <span className="mt-auto pt-1 text-sm font-semibold text-brand">
                      Read article →
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* SEO footer copy */}
      <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-line bg-surface p-6 text-sm leading-relaxed text-muted">
        <h2 className="mb-2 text-lg font-bold text-ink">
          Home care advice for Kenyan families
        </h2>
        <p>
          Our editorial team in Nairobi publishes practical guides on{" "}
          <Link href="/caretakers" className="font-semibold text-brand">
            finding caretakers
          </Link>
          , caregiver pricing in Kenya, first aid, elder care and household management. Every
          article is written for the Kenyan context — real neighbourhoods, real KES figures, real
          certification bodies. New here? Read our{" "}
          <Link href="/faq" className="font-semibold text-brand">
            FAQ
          </Link>{" "}
          or <Link href="/signup" className="font-semibold text-brand">create an account</Link>.
        </p>
      </div>
    </div>
  );
}
