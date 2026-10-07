import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/caretakers",
    "/about",
    "/blog",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/signup",
    "/login",
  ].map((path) => ({
    url: `${site}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/caretakers" || path === "/blog" ? 0.9 : 0.6,
  }));

  try {
    const [posts, profiles] = await Promise.all([
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.profile.findMany({
        where: { user: { role: "WORKER" }, caretakerDetails: { isNot: null } },
        select: { id: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...posts.map((post) => ({
        url: `${site}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...profiles.map((profile) => ({
        url: `${site}/caretakers/${profile.id}`,
        lastModified: profile.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
