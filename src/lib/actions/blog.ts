"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export type BlogState = { error?: string } | null;

async function requireAdmin() {
  const user = await requireSession("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

const postSchema = z.object({
  title: z.string().trim().min(4, "Title needs at least 4 characters"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug needs at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and hyphens"),
  excerpt: z.string().trim().min(20, "Excerpt needs at least 20 characters").max(200, "Excerpt is too long (max 200)"),
  category: z.string().trim().max(40).optional().default(""),
  tags: z.string().trim().max(200).optional().default(""),
  content: z.string().trim().min(50, "Post body needs at least 50 characters"),
  coverImageUrl: z.string().trim().optional().default(""),
  status: z.enum(["DRAFT", "PUBLISHED"], { message: "Choose a status" }),
});

/** Create or update a blog post (admin only). */
export async function savePostAction(
  _prev: BlogState,
  formData: FormData
): Promise<BlogState> {
  await requireAdmin();

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    category: formData.get("category") ?? "",
    tags: formData.get("tags") ?? "",
    content: formData.get("content"),
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const d = parsed.data;
  const tags = d.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
  const id = String(formData.get("id") ?? "");
  const status = d.status;

  try {
    if (id) {
      const existing = await prisma.blogPost.findUnique({ where: { id } });
      if (!existing) return { error: "Post not found" };
      await prisma.blogPost.update({
        where: { id },
        data: {
          title: d.title,
          slug: d.slug,
          excerpt: d.excerpt,
          category: d.category || null,
          tags,
          content: d.content,
          coverImageUrl: d.coverImageUrl || null,
          status,
          publishedAt:
            status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        },
      });
    } else {
      await prisma.blogPost.create({
        data: {
          title: d.title,
          slug: d.slug,
          excerpt: d.excerpt,
          category: d.category || null,
          tags,
          content: d.content,
          coverImageUrl: d.coverImageUrl || null,
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        },
      });
    }
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { error: "That slug is already used by another post" };
    }
    throw err;
  }

  redirect("/admin/posts?saved=1");
}

/** Publish / unpublish an existing post. */
export async function togglePublishAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) redirect("/admin/posts?error=missing");

  const next = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  await prisma.blogPost.update({
    where: { id },
    data: {
      status: next,
      publishedAt: next === "PUBLISHED" ? (post.publishedAt ?? new Date()) : post.publishedAt,
    },
  });
  redirect("/admin/posts?saved=1");
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.blogPost.deleteMany({ where: { id } });
  }
  redirect("/admin/posts?deleted=1");
}
