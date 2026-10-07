import type { Metadata } from "next";
import { BlogComposer } from "@/components/BlogComposer";

export const metadata: Metadata = {
  title: "New post (admin)",
  robots: { index: false },
};

export default function NewPostPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-ink">Compose a new post</h2>
      <BlogComposer
        initial={{
          title: "",
          slug: "",
          excerpt: "",
          category: "Guides",
          tags: "",
          content: "",
          coverImageUrl: "",
          status: "DRAFT",
        }}
      />
    </div>
  );
}
