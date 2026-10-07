"use client";

import { useActionState, useState } from "react";
import {
  updateAccountDetailsAction,
  changePasswordAction,
  updatePreferencesAction,
  deleteAccountAction,
} from "@/lib/actions/account";

/* ------------------------------- Profile details ------------------------------- */

export function AccountDetailsForm({
  fullName,
  location,
  phone,
  bio,
  avatarUrl,
}: {
  fullName: string;
  location: string;
  phone: string;
  bio: string;
  avatarUrl: string;
}) {
  const [state, formAction, pending] = useActionState(updateAccountDetailsAction, null);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadAvatar(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setAvatar(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="avatarUrl" value={avatar} />

      {/* Avatar picker */}
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar || "https://randomuser.me/api/portraits/lego/1.jpg"}
          alt="Your avatar"
          className="h-16 w-16 rounded-full border border-line object-cover"
        />
        <div>
          <label className="btn btn-secondary cursor-pointer">
            {uploading ? "Uploading…" : avatar ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
          </label>
          <p className="mt-1 text-xs text-muted">JPG, PNG or WebP · max 5 MB</p>
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" defaultValue={fullName} required className="input" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input
            id="location"
            name="location"
            defaultValue={location}
            placeholder="Kilimani, Nairobi"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone <span className="text-muted">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={phone}
            placeholder="+254712345678"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bio">
          Short bio <span className="text-muted">(optional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={bio}
          rows={3}
          maxLength={1000}
          className="input resize-y"
          placeholder="A line about you — shows up beside your messages."
        />
      </div>

      {state?.error && <p className="field-error">{state.error}</p>}
      <button type="submit" disabled={pending || uploading} className="btn btn-primary">
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

/* ------------------------------- Preferences ------------------------------- */

export function PreferencesForm({ notifyByEmail }: { notifyByEmail: boolean }) {
  const [state, formAction, pending] = useActionState(updatePreferencesAction, null);

  return (
    <form action={formAction}>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
        <input
          type="checkbox"
          name="notifyByEmail"
          defaultChecked={notifyByEmail}
          className="mt-0.5 h-4 w-4 accent-teal-600"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">Email notifications</span>
          <span className="block text-xs text-muted">
            Booking updates, new messages and replies from the Caregiver team.
          </span>
        </span>
      </label>
      {state?.error && <p className="field-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-secondary mt-3">
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}

/* ------------------------------- Password ------------------------------- */

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="label" htmlFor="current">Current password</label>
        <input id="current" name="current" type="password" required autoComplete="current-password" className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="next">New password</label>
          <input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
        </div>
      </div>
      {state?.error && <p className="field-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-navy">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

/* ------------------------------- Danger zone ------------------------------- */

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-danger">
        Delete my account…
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="label" htmlFor="del-password">Confirm your password</label>
        <input id="del-password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="del-confirm">
          Type <strong>DELETE</strong> to confirm
        </label>
        <input id="del-confirm" name="confirm" required className="input" placeholder="DELETE" />
      </div>
      {state?.error && <p className="field-error">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-danger">
          {pending ? "Deleting…" : "Permanently delete"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
          Keep my account
        </button>
      </div>
    </form>
  );
}
