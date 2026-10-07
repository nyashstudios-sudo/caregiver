"use client";

import { useActionState, useRef, useState } from "react";
import {
  addCertificationAction,
  deleteCertificationAction,
  updateWorkerProfileAction,
  type ProfileState,
} from "@/lib/actions/profile";
import { Avatar } from "./Avatar";

export type WorkerProfileInitial = {
  fullName: string;
  location: string;
  bio: string;
  avatarUrl: string;
  hourlyRate: number;
  yearsExperience: number;
  skillsSummary: string;
  hasFirstAid: boolean;
  isCertifiedMassage: boolean;
};

export type CertificationItem = {
  id: string;
  title: string;
  documentUrl: string;
  issuedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
};

/** Edit profile + CaretakerDetails (rate, experience, badges, skills). */
export function WorkerProfileForm({ initial }: { initial: WorkerProfileInitial }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateWorkerProfileAction,
    null
  );
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setAvatarUrl(json.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="card p-6">
      <h2 className="mb-4 text-lg font-bold text-ink">Profile &amp; services</h2>

      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      {/* Avatar */}
      <div className="mb-5 flex items-center gap-4">
        <Avatar src={avatarUrl} name={initial.fullName} size={72} />
        <div>
          <p className="mb-1 text-sm font-medium text-ink">Profile photo</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </div>
        <input type="hidden" name="avatarUrl" value={avatarUrl} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fullName">
            Full name
          </label>
          <input
            className="input"
            id="fullName"
            name="fullName"
            defaultValue={initial.fullName}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="location">
            Location
          </label>
          <input
            className="input"
            id="location"
            name="location"
            defaultValue={initial.location}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="hourlyRate">
            Hourly rate (KES)
          </label>
          <input
            className="input"
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            min={0}
            step={0.5}
            defaultValue={initial.hourlyRate}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="yearsExperience">
            Years of experience
          </label>
          <input
            className="input"
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            step={1}
            defaultValue={initial.yearsExperience}
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="bio">
          Bio
        </label>
        <textarea
          className="input"
          id="bio"
          name="bio"
          rows={3}
          maxLength={1000}
          defaultValue={initial.bio}
          placeholder="Tell clients about yourself and your approach to care."
        />
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="skillsSummary">
          Skills summary
        </label>
        <textarea
          className="input"
          id="skillsSummary"
          name="skillsSummary"
          rows={2}
          maxLength={1000}
          defaultValue={initial.skillsSummary}
          placeholder="e.g. Elderly care, meal prep, infant care, deep-tissue massage"
        />
      </div>

      <fieldset className="mt-4">
        <legend className="label">Verified specializations</legend>
        <div className="flex flex-wrap gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="hasFirstAid"
              defaultChecked={initial.hasFirstAid}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Has first aid
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="isCertifiedMassage"
              defaultChecked={initial.isCertifiedMassage}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Certified massage
          </label>
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary mt-6" disabled={pending || uploading}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

/** Upload + manage certification documents (PDF/image) stored in file storage. */
export function CertificationManager({
  certifications,
}: {
  certifications: CertificationItem[];
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    async (prev, formData) => {
      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = (await res.json()) as { url?: string; error?: string };
        formData.delete("file");
        if (!res.ok || !json.url) {
          return { error: json.error || "Upload failed" };
        }
        formData.set("documentUrl", json.url);
      }
      return addCertificationAction(prev, formData);
    },
    null
  );

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-bold text-ink">Certifications</h2>
      <p className="mb-4 text-sm text-muted">
        Upload PDF or image copies of your credentials (first aid, massage diplomas). An admin
        vets each upload before it counts toward your public badge.
      </p>

      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      {certifications.length === 0 ? (
        <p className="mb-4 text-sm text-muted">No certifications uploaded yet.</p>
      ) : (
        <ul className="mb-5 divide-y divide-line">
          {certifications.map((cert) => (
            <li key={cert.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{cert.title}</p>
                  <span
                    className={`badge ${
                      cert.status === "APPROVED"
                        ? "badge-green"
                        : cert.status === "REJECTED"
                          ? "badge-red"
                          : "badge-amber"
                    }`}
                  >
                    {cert.status === "APPROVED"
                      ? "✓ Approved"
                      : cert.status === "REJECTED"
                        ? "Rejected"
                        : "In review"}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {cert.issuedAt ? `Issued ${cert.issuedAt}` : "Issue date not set"}
                </p>
                {cert.status === "REJECTED" && cert.reviewNote && (
                  <p className="mt-1 text-xs text-red-500">Note: {cert.reviewNote}</p>
                )}
              </div>
              <div className="flex gap-2">
                <a
                  href={cert.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  View ↗
                </a>
                <form action={deleteCertificationAction}>
                  <input type="hidden" name="id" value={cert.id} />
                  <button type="submit" className="btn btn-danger">
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="certTitle">
            Certificate title
          </label>
          <input
            className="input"
            id="certTitle"
            name="title"
            placeholder="e.g. First Aid Level 3"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="issuedAt">
            Issued at <span className="font-normal text-muted">(optional)</span>
          </label>
          <input className="input" id="issuedAt" name="issuedAt" type="date" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="certFile">
            Document (PDF, PNG or JPG — max 5 MB)
          </label>
          <input
            className="input"
            id="certFile"
            name="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Uploading…" : "Upload certification"}
          </button>
        </div>
      </form>
    </div>
  );
}
