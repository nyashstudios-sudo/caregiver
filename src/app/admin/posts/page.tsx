import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { deletePostAction, togglePublishAction } from "@/lib/actions/blog";

export const metadata: Metadata = {
  title: "Blog posts (admin)",
  robots: { index: false },
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

  const posts = await prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      {single(sp.saved) && <p className="field-ok mb-4">✓ Post saved.</p>}
      {single(sp.deleted) && <p className="field-ok mb-4">✓ Post deleted.</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </h2>
        <Link href="/admin/posts/new" className="btn btn-primary">
          + New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No posts yet —{" "}
          <Link href="/admin/posts/new" className="font-semibold text-brand">
            write your first one
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`badge ${post.status === "PUBLISHED" ? "badge-green" : "badge-amber"}`}
                    >
                      {post.status}
                    </span>
                    {post.category && <span className="badge badge-slate">{post.category}</span>}
                  </div>
                  <p className="mt-1.5 font-bold text-ink">{post.title}</p>
                  <p className="text-xs text-muted">
                    /blog/{post.slug} · updated {formatDate(post.updatedAt)} ·{" "}
                    {post.status === "PUBLISHED"
                      ? `published ${formatDate(post.publishedAt)}`
                      : "not published"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/admin/posts/${post.id}`} className="btn btn-secondary">
                    Edit
                  </Link>
                  {post.status === "PUBLISHED" && (
                    <Link href={`/blog/${post.slug}`} className="btn btn-secondary">
                      View ↗
                    </Link>
                  )}
                  <form action={togglePublishAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <button
                      type="submit"
                      className={post.status === "PUBLISHED" ? "btn btn-secondary" : "btn btn-primary"}
                    >
                      {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                  <form action={deletePostAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <button type="submit" className="btn btn-danger">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
