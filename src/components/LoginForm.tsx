"use client";

import { useActionState, useState } from "react";
import {
  loginAction,
  loginWithPhoneAction,
  sendOtpAction,
} from "@/lib/actions/auth";
import { GoogleButton } from "./GoogleButton";

export function LoginForm({
  next,
  googleEnabled = false,
}: {
  next?: string;
  googleEnabled?: boolean;
}) {
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  // Controlled so a failed attempt (React 19 resets the form) keeps the email.
  const [email, setEmail] = useState("");

  const [emailState, emailAction, emailPending] = useActionState(loginAction, null);
  const [otpState, otpAction, otpPending] = useActionState(sendOtpAction, null);
  const [phoneState, phoneAction, phonePending] = useActionState(
    loginWithPhoneAction,
    null
  );

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
      active
        ? "bg-surface text-ink shadow-sm"
        : "text-muted hover:text-ink"
    }`;

  return (
    <div className="card p-6">
      {googleEnabled && (
        <div className="mb-5">
          <GoogleButton mode="signin" next={next} />
          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or use email
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        <button
          type="button"
          className={tabClass(tab === "email")}
          onClick={() => setTab("email")}
        >
          Email &amp; password
        </button>
        <button type="button" className={tabClass(tab === "phone")} onClick={() => setTab("phone")}>
          Phone code
        </button>
      </div>

      {tab === "email" ? (
        <form action={emailAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {emailState?.error && (
            <p className="field-error" role="alert">
              {emailState.error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={emailPending}>
            {emailPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <form action={otpAction} className="space-y-3">
            <div>
              <label className="label" htmlFor="phone">
                Phone number
              </label>
              <div className="flex gap-2">
                <input
                  className="input"
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+263771234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-secondary shrink-0" disabled={otpPending}>
                  {otpPending ? "Sending…" : "Send code"}
                </button>
              </div>
            </div>
            {otpState?.error && (
              <p className="field-error" role="alert">
                {otpState.error}
              </p>
            )}
            {otpState?.ok && otpState.devCode && (
              <p className="field-ok">
                ✓ Code sent. <strong>Dev mode:</strong> your code is{" "}
                <strong className="tracking-widest">{otpState.devCode}</strong> (in production this
                arrives by SMS).
              </p>
            )}
          </form>

          <form action={phoneAction} className="space-y-3 border-t border-line pt-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <div>
              <label className="label" htmlFor="phone2">
                Phone number
              </label>
              <input
                className="input"
                id="phone2"
                name="phone"
                type="tel"
                placeholder="+263771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="code">
                One-time code
              </label>
              <input
                className="input tracking-widest"
                id="code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            {phoneState?.error && (
              <p className="field-error" role="alert">
                {phoneState.error}
              </p>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={phonePending}>
              {phonePending ? "Verifying…" : "Sign in with code"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
