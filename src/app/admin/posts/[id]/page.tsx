import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BlogComposer } from "@/components/BlogComposer";

export const metadata: Metadata = {
  title: "Edit post (admin)",
  robots: { index: false },
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-ink">Edit post</h2>
      <BlogComposer
        initial={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          category: post.category ?? "",
          tags: post.tags.join(", "),
          content: post.content,
          coverImageUrl: post.coverImageUrl ?? "",
          status: post.status,
        }}
      />
    </div>
  );
}
