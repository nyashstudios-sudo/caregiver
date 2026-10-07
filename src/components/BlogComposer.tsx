"use client";

import { useActionState, useRef, useState } from "react";
import { savePostAction, type BlogState } from "@/lib/actions/blog";

export type PostDraft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string; // comma separated
  content: string;
  coverImageUrl: string;
  status: "DRAFT" | "PUBLISHED";
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Admin composer: create/edit blog posts, upload cover, publish or draft. */
export function BlogComposer({ initial }: { initial: PostDraft }) {
  const isEdit = Boolean(initial.id);
  const [state, formAction, pending] = useActionState<BlogState, FormData>(
    savePostAction,
    null
  );

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  function handleTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleCoverUpload() {
    const file = coverRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setCoverImageUrl(json.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

      <div className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="post-title">
            Title
          </label>
          <input
            className="input"
            id="post-title"
            name="title"
            required
            value={title}
            onChange={(e) => handleTitle(e.target.value)}
            placeholder="e.g. How Much Does a Caregiver Cost in Kenya?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="post-slug">
              Slug (URL)
            </label>
            <input
              className="input font-mono"
              id="post-slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
              }}
              placeholder="caregiver-cost-kenya"
            />
            <p className="mt-1 text-xs text-muted">/blog/{slug || "your-slug"}</p>
          </div>
          <div>
            <label className="label" htmlFor="post-category">
              Category
            </label>
            <input
              className="input"
              id="post-category"
              name="category"
              defaultValue={initial.category}
              placeholder="e.g. Pricing, Guides, Health"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="post-excerpt">
            Excerpt (shown in listings &amp; search results)
          </label>
          <textarea
            className="input"
            id="post-excerpt"
            name="excerpt"
            rows={2}
            required
            maxLength={200}
            defaultValue={initial.excerpt}
            placeholder="One or two sentences that make people click — ~150 characters is ideal for SEO."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="post-tags">
              Tags <span className="font-normal text-muted">(comma separated)</span>
            </label>
            <input
              className="input"
              id="post-tags"
              name="tags"
              defaultValue={initial.tags}
              placeholder="nairobi, nanny, pricing"
            />
          </div>
          <div>
            <label className="label">Cover image</label>
            <div className="flex items-center gap-2">
              <input
                ref={coverRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleCoverUpload}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => coverRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : coverImageUrl ? "Replace cover" : "Upload cover"}
              </button>
              {coverImageUrl && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setCoverImageUrl("")}
                >
                  Remove
                </button>
              )}
            </div>
            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          </div>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <label className="label mb-0" htmlFor="post-content">
            Content (Markdown)
          </label>
          <span className="text-xs text-muted">
            ## heading · **bold** · - list · [link](/path)
          </span>
        </div>
        <textarea
          className="input min-h-[420px] font-mono text-[13px] leading-relaxed"
          id="post-content"
          name="content"
          required
          defaultValue={initial.content}
          placeholder={"## Subheading\n\nWrite your paragraph here…\n\n- Bullet point"}
        />
      </div>

      <div className="card flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <label className="label">Status</label>
          <div className="flex gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink">
              <input
                type="radio"
                name="status"
                value="DRAFT"
                defaultChecked={initial.status === "DRAFT"}
                className="accent-brand"
              />
              Draft
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink">
              <input
                type="radio"
                name="status"
                value="PUBLISHED"
                defaultChecked={initial.status === "PUBLISHED"}
                className="accent-brand"
              />
              Published
            </label>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending || uploading}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create post"}
        </button>
      </div>

      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
