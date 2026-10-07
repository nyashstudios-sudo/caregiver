"use client";

import { useActionState, useRef, useState } from "react";
import { addPortfolioItemAction, deletePortfolioItemAction } from "@/lib/actions/portfolio";
import type { ActionState } from "@/lib/actions/state";

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  clientName: string | null;
  location: string | null;
  projectUrl: string | null;
  mediaUrl: string | null;
  completedAt: string | null;
};

/**
 * Portfolio studio — workers document past jobs (photo + story) so clients
 * can judge the craft before booking. Uploads go through /api/files storage.
 */
export function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addPortfolioItemAction,
    null
  );
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setMediaUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Portfolio</h2>
          <p className="text-sm text-muted">
            Show real past work — photos, clients and outcomes. Pieces appear on your public
            profile.
          </p>
        </div>
        <span className="badge badge-slate shrink-0">{items.length}/30</span>
      </div>

      <form action={formAction} className="mb-5 space-y-3 rounded-xl border border-line p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pf-title">
              Title *
            </label>
            <input
              id="pf-title"
              name="title"
              className="input"
              required
              minLength={3}
              maxLength={90}
              placeholder="e.g. Full-time nanny — twins, Kilimani"
            />
          </div>
          <div>
            <label className="label" htmlFor="pf-category">
              Category
            </label>
            <input
              id="pf-category"
              name="category"
              className="input"
              maxLength={60}
              placeholder="Childcare, Elder care, Housekeeping…"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pf-description">
            What you did
          </label>
          <textarea
            id="pf-description"
            name="description"
            className="input min-h-20"
            maxLength={800}
            placeholder="Scope, duration, results — the story a client cares about."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="pf-client">
              Client
            </label>
            <input
              id="pf-client"
              name="clientName"
              className="input"
              maxLength={80}
              placeholder="e.g. The Njoroge family"
            />
          </div>
          <div>
            <label className="label" htmlFor="pf-location">
              Location
            </label>
            <input
              id="pf-location"
              name="location"
              className="input"
              maxLength={80}
              placeholder="e.g. Lavington"
            />
          </div>
          <div>
            <label className="label" htmlFor="pf-year">
              Completed
            </label>
            <input
              id="pf-year"
              name="completedAt"
              type="month"
              className="input"
              max={new Date().toISOString().slice(0, 7)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pf-url">
              Project link <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="pf-url"
              name="projectUrl"
              type="url"
              className="input"
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="label">Photo</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn btn-secondary !py-2 text-xs"
              >
                {uploading ? "Uploading…" : mediaUrl ? "Replace photo" : "Upload photo"}
              </button>
              {mediaUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setMediaUrl("")}
                    className="text-xs text-muted hover:text-red-500"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <input type="hidden" name="mediaUrl" value={mediaUrl} />
            {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
          </div>
        </div>

        {state?.error && (
          <p className="field-error" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending || uploading}>
          {pending ? "Adding…" : "Add to portfolio"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No pieces yet — your first one could be yesterday&apos;s shift. Clients book3× more
          often when they can see the work.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-xl border border-line p-3">
              {item.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.mediaUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-brand-soft text-2xl">
                  🧩
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold text-ink">{item.title}</p>
                  {item.category && <span className="badge badge-teal">{item.category}</span>}
                </div>
                {item.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.description}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {item.clientName ? `${item.clientName} · ` : ""}
                  {item.location ? `${item.location} · ` : ""}
                  {item.completedAt ? item.completedAt.slice(0, 7) : ""}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {item.projectUrl && (
                    <a
                      href={item.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Open link ↗
                    </a>
                  )}
                  <form action={deletePortfolioItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
