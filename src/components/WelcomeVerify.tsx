"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  resendVerificationAction,
  verifyEmailCodeAction,
} from "@/lib/actions/verify";

/**
 * Code-entry card on /welcome — the server owns the cooldown and the GoTrue
 * exchange, this component only collects the 6 digits and resends.
 */
export function WelcomeVerify({ email, homeHref }: { email: string; homeHref: string }) {
  const [codeState, verifyAction, codePending] = useActionState(verifyEmailCodeAction, null);
  const [resendState, resendAction, resendPending] = useActionState(resendVerificationAction, null);

  return (
    <div className="space-y-5">
      <form action={verifyAction} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="verify-code">
            Verification code
          </label>
          <input
            id="verify-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="123456"
            className="input text-center font-mono text-2xl tracking-[0.5em]"
          />
          <p className="mt-1.5 text-xs text-muted">
            Sent to <span className="font-semibold text-ink">{email}</span> — the code expires
            shortly, request a fresh one if needed.
          </p>
        </div>

        {codeState?.error && (
          <p className="field-error" role="alert">
            {codeState.error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={codePending}>
          {codePending ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-sm">
        <form action={resendAction}>
          <button
            type="submit"
            className="font-semibold text-brand hover:underline"
            disabled={resendPending}
          >
            {resendPending ? "Sending…" : "Resend the code"}
          </button>
        </form>
        {resendState?.message && <p className="text-xs text-muted">{resendState.message}</p>}
        {resendState?.error && <p className="text-xs text-red-500">{resendState.error}</p>}

        <Link href={homeHref} className="text-muted hover:text-ink">
          Skip for now — I&apos;ll verify later →
        </Link>
      </div>
    </div>
  );
}
