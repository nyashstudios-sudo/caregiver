import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function readTime(content: string): number {
  return Math.max(1, Math.round(content.split(/\s+/).length / 200));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED") return { title: "Article not found" };

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.authorName }],
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.authorName],
      tags: post.tags,
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED") notFound();

  const related = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: post.id },
      ...(post.category ? { category: post.category } : {}),
    },
    take: 3,
    orderBy: { publishedAt: "desc" },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", name: "Caregiver" },
    mainEntityOfPage: `/blog/${post.slug}`,
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
    keywords: post.tags.join(", "),
  };

  return (
    <article className="container-page py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm font-medium text-muted transition hover:text-ink">
          ← All articles
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="eyebrow">{post.category ?? "Guides"}</span>
          <span className="text-muted">
            {formatDate(post.publishedAt)} · {readTime(post.content)} min read · by{" "}
            {post.authorName}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{post.excerpt}</p>

        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt=""
            className="mt-6 h-56 w-full rounded-2xl object-cover sm:h-72"
          />
        ) : (
          <div
            className="mt-6 flex h-44 items-center justify-center rounded-2xl bg-linear-to-br from-brand to-brand-strong sm:h-56"
            aria-hidden
          >
            <span className="text-3xl font-black text-white/30">Caregiver</span>
          </div>
        )}

        <div className="mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />

        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="badge badge-slate">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="card mt-10 flex flex-col items-center gap-3 bg-linear-to-br from-brand to-brand-strong p-6 text-center sm:p-8">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">
            Ready to find a caregiver?
          </h2>
          <p className="text-sm text-white/85">
            Browse verified professionals across Kenya with transparent KES rates.
          </p>
          <Link
            href="/caretakers"
            className="btn bg-white px-5 py-2.5 text-brand-strong hover:bg-white/90 dark:text-[#04231f]"
          >
            Browse caretakers
          </Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <>
            <h2 className="mt-12 mb-4 text-xl font-bold text-ink">Keep reading</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="card group flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="eyebrow">{item.category ?? "Guides"}</span>
                  <span className="font-semibold leading-snug text-ink group-hover:text-brand">
                    {item.title}
                  </span>
                  <span className="mt-auto pt-1 text-xs text-muted">
                    {formatDate(item.publishedAt)}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
