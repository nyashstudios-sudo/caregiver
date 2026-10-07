"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { signupAction } from "@/lib/actions/auth";
import { GoogleButton } from "./GoogleButton";

type Role = "CLIENT" | "WORKER";

const ROLE_CARDS: { value: Role; title: string; body: string; icon: string }[] = [
  {
    value: "CLIENT",
    title: "I want to hire",
    body: "Browse verified caretakers, compare rates and send booking requests.",
    icon: "🔎",
  },
  {
    value: "WORKER",
    title: "I want to work",
    body: "Showcase skills, rates, portfolio and certifications to real clients.",
    icon: "🤝",
  },
];

const LOCATIONS = [
  "Kilimani, Nairobi",
  "Westlands, Nairobi",
  "Karen, Nairobi",
  "Lavington, Nairobi",
  "Kasarani, Nairobi",
  "Embakasi, Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Juja",
];

const SKILL_SUGGESTIONS = [
  "Childcare",
  "Elder care",
  "Cooking",
  "Cleaning",
  "Laundry",
  "Homework help",
  "Physiotherapy",
  "Hair & grooming",
];

/** Cheap client-side strength read — the server still owns real policy. */
function scorePassword(pw: string): { score: number; label: string; className: string } {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (pw.length === 0) return { score: 0, label: "", className: "" };
  if (score <= 1) return { score, label: "Weak", className: "bg-red-500" };
  if (score <= 3) return { score, label: "Fair", className: "bg-amber-500" };
  return { score, label: "Strong", className: "bg-emerald-500" };
}

export function SignupForm({
  defaultRole = "CLIENT",
  googleEnabled = false,
}: {
  defaultRole?: Role;
  googleEnabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(signupAction, null);
  const [role, setRole] = useState<Role>(defaultRole);
  // Controlled fields so validation errors don't wipe what was typed
  // (React 19 resets uncontrolled form fields after every action).
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [rate, setRate] = useState("");

  const strength = useMemo(() => scorePassword(password), [password]);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <input type="hidden" name="role" value={role} />

      {googleEnabled && (
        <div>
          <GoogleButton mode="signup" role={role} />
          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or join with email
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      {/* ── Account type ─────────────────────────────────────────── */}
      <fieldset>
        <legend className="label">Account type</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_CARDS.map((card) => {
            const active = role === card.value;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => setRole(card.value)}
                aria-pressed={active}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-brand bg-brand-soft ring-1 ring-brand"
                    : "border-line bg-surface hover:border-brand"
                }`}
              >
                <span className="mb-1 block text-xl">{card.icon}</span>
                <span className="block font-bold text-ink">{card.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{card.body}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fullName">
            Full name
          </label>
          <input
            className="input"
            id="fullName"
            name="fullName"
            required
            minLength={2}
            autoComplete="name"
            placeholder="e.g. Amina Wanjiku"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
            list="location-options"
            required
            autoComplete="address-level2"
            placeholder="e.g. Kilimani, Nairobi"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <datalist id="location-options">
            {LOCATIONS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="signupEmail">
            Email
          </label>
          <input
            className="input"
            id="signupEmail"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="signupPhone">
            Phone{" "}
            <span className="font-normal text-muted">
              ({role === "WORKER" ? "clients will call this" : "optional"})
            </span>
          </label>
          <input
            className="input"
            id="signupPhone"
            name="phone"
            type="tel"
            placeholder="+254712345678"
            autoComplete="tel"
            pattern="(\+254|0)(7|1)\d{8}"
            title="Kenyan format, e.g. +254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {/* ── Password ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="signupPassword">
            Password
          </label>
          <input
            className="input"
            id="signupPassword"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="8+ characters, letters & numbers"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-1.5 rounded-full transition-all ${strength.className}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right text-[11px] font-bold text-muted">
                {strength.label}
              </span>
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            className="input"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
          />
          {mismatch && <p className="mt-1 text-xs text-red-500">Passwords do not match</p>}
        </div>
      </div>

      {/* ── Worker onboarding ────────────────────────────────────── */}
      {role === "WORKER" && (
        <fieldset className="space-y-4 rounded-xl border border-brand/25 bg-brand-soft/40 p-4">
          <legend className="label px-1 !text-brand">
            Your work profile — shown to clients right away
          </legend>

          <div>
            <label className="label" htmlFor="bio">
              Short bio
            </label>
            <textarea
              className="input min-h-24"
              id="bio"
              name="bio"
              maxLength={600}
              placeholder="Who you are, who you care for, and what clients can expect…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                max={60}
                required
                placeholder="e.g. 4"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
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
                min={100}
                max={20000}
                step={50}
                required
                placeholder="e.g. 500"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="skillsSummary">
              Skills <span className="font-normal text-muted">(comma separated)</span>
            </label>
            <input
              className="input"
              id="skillsSummary"
              name="skillsSummary"
              maxLength={400}
              placeholder="Childcare, cooking, homework help…"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setSkills((prev) =>
                      prev.toLowerCase().includes(s.toLowerCase())
                        ? prev
                        : prev
                          ? `${prev}, ${s}`
                          : s
                    )
                  }
                  className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-brand"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-ink">
              <input type="checkbox" name="hasFirstAid" className="h-4 w-4 accent-teal-600" />
              First-aid certified
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-medium text-ink">
              <input
                type="checkbox"
                name="isCertifiedMassage"
                className="h-4 w-4 accent-teal-600"
              />
              Certified massage therapist
            </label>
          </div>
        </fieldset>
      )}

      {/* ── Terms ────────────────────────────────────────────────── */}
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          name="terms"
          required
          className="mt-0.5 h-4 w-4 accent-teal-600"
        />
        <span>
          I&apos;m16 or older and agree to the{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-brand hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="font-semibold text-brand hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating account…" : role === "WORKER" ? "Create worker account" : "Create account"}
      </button>

      <p className="text-center text-xs text-muted">
        We&apos;ll email a verification code so clients know the platform is real — no spam,
        ever.
      </p>
    </form>
  );
}
