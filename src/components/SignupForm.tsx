"use client";

import { useActionState, useState } from "react";
import { signupAction } from "@/lib/actions/auth";
import { GoogleButton } from "./GoogleButton";

type Role = "CLIENT" | "WORKER";

const ROLE_CARDS: { value: Role; title: string; body: string; icon: string }[] = [
  {
    value: "CLIENT",
    title: "I want to hire",
    body: "Browse verified caretakers and send booking requests.",
    icon: "🔎",
  },
  {
    value: "WORKER",
    title: "I want to work",
    body: "Showcase your skills, rates and certifications to clients.",
    icon: "🤝",
  },
];

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

  return (
    <form action={formAction} className="card space-y-4 p-6">
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
            autoComplete="name"
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
            placeholder="e.g. Kilimani, Nairobi"
            required
            autoComplete="address-level2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

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
          Phone <span className="font-normal text-muted">(optional — enables phone login)</span>
        </label>
        <input
          className="input"
          id="signupPhone"
          name="phone"
          type="tel"
          placeholder="+254712345678"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

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
          minLength={6}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
