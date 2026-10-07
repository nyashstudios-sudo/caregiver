"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Phase = "working" | "done" | "failed";

/**
 * Landing strip for the emailed verification link. GoTrue redirects here with
 * the token in the URL hash — the browser never sends it to our server, so we
 * exchange it client-side and report the outcome.
 */
export function LinkConfirm({ homeHref }: { homeHref: string }) {
  const [phase, setPhase] = useState<Phase>("working");
  const [detail, setDetail] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("access_token") || params.get("id_token") || "";

    if (!token) {
      setPhase("failed");
      setDetail(
        "This link is missing its token — open the newest verification email, or enter the code on the previous screen."
      );
      return;
    }

    fetch("/api/auth/email-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setPhase("done");
          setTimeout(() => {
            window.location.href = homeHref;
          }, 1800);
        } else {
          const body = await res.json().catch(() => ({}));
          setPhase("failed");
          setDetail(body.error || "The link could not be confirmed — try a fresh code instead.");
        }
      })
      .catch(() => {
        setPhase("failed");
        setDetail("Network hiccup while confirming — try again with a new email.");
      });
  }, [homeHref]);

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <div
        className={`mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl text-4xl text-white shadow-xl ${
          phase === "done"
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
            : phase === "failed"
              ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25"
              : "bg-gradient-to-br from-brand to-brand-strong shadow-brand/25"
        }`}
        aria-hidden
      >
        {phase === "done" ? "✓" : phase === "failed" ? "!" : "…"}
      </div>

      <h1 className="text-2xl font-extrabold text-ink">
        {phase === "done"
          ? "Email verified!"
          : phase === "failed"
            ? "Link not accepted"
            : "Confirming your email…"}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {phase === "done"
          ? "Taking you back to the platform — everything on your account is now verified."
          : phase === "failed"
            ? detail
            : "Hang tight while we check the confirmation link from your inbox."}
      </p>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Link href={homeHref} className="btn btn-primary">
          Continue →
        </Link>
        {phase === "failed" && (
          <Link href="/welcome" className="font-semibold text-brand hover:underline">
            Enter a code instead
          </Link>
        )}
      </div>
    </div>
  );
}
