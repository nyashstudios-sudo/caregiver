"use client";

import { useEffect, useState } from "react";

/**
 * PWA controller rendered once in the root layout:
 *  - registers the service worker (offline shell + push receiver),
 *  - offers a themed "Install app" pill when the browser is eligible,
 *  - offers an "Enable alerts" pill that asks notification permission and
 *    subscribes this device to Web Push (only ever on a user gesture).
 *
 * Everything hides itself in standalone mode, after dismissal, or when the
 * browser doesn't support the capability.
 */

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const LS_ALERTS = "cg-alerts-dismissed";
const LS_INSTALL = "cg-install-dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Str = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Str);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function PwaInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [canAlerts, setCanAlerts] = useState(false);
  const [alertOn, setAlertOn] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [alertsDismissed, setAlertsDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  /* ── Service worker registration ─────────────────────────────── */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  /* ── Standalone detection (installed app → no prompts) ───────── */
  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(Boolean(standalone));
    if (standalone) return;

    setInstallDismissed(localStorage.getItem(LS_INSTALL) === "1");
    setAlertsDismissed(localStorage.getItem(LS_ALERTS) === "1");

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  /* ── Notification capability probe (permission is never asked here) ── */
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    const perm = Notification.permission;
    setAlertOn(perm === "granted");
    setCanAlerts(perm === "default" && !installed);
    // After login the pills should reconsider; permission can change externally.
    const onFocus = () => {
      const p = Notification.permission;
      setAlertOn(p === "granted");
      setCanAlerts(p === "default" && !installed);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [installed]);

  const install = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setDeferred(null);
      } else {
        setInstallDismissed(true);
        localStorage.setItem(LS_INSTALL, "1");
      }
    } finally {
      setBusy(false);
    }
  };

  const enableAlerts = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setAlertsDismissed(true);
        localStorage.setItem(LS_ALERTS, "1");
        return;
      }
      const registration = await navigator.serviceWorker.ready;

      const res = await fetch("/api/push/public-key").then((r) => r.json());
      if (!res.enabled || !res.publicKey) return;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(res.publicKey) as BufferSource,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setAlertOn(true);
      setCanAlerts(false);
    } catch {
      setCanAlerts(false);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = (key: typeof LS_ALERTS | typeof LS_INSTALL) => {
    localStorage.setItem(key, "1");
    if (key === LS_ALERTS) setAlertsDismissed(true);
    else {
      setInstallDismissed(true);
      setDeferred(null);
    }
  };

  if (installed) return null;

  const showInstall = Boolean(deferred) && !installDismissed;
  const showAlerts = canAlerts && !alertsDismissed && !alertOn;
  if (!showInstall && !showAlerts) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 flex flex-col items-center gap-2 px-4 md:bottom-4">
      {showAlerts && (
        <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-brand/30 bg-surface/95 p-2.5 shadow-lg backdrop-blur">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg">
            🔔
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink">Get instant alerts</p>
            <p className="truncate text-[11px] text-muted">
              New messages, booking updates &amp; payouts
            </p>
          </div>
          <button
            type="button"
            onClick={enableAlerts}
            disabled={busy}
            className="btn btn-primary !px-3 !py-1.5 text-xs"
          >
            {busy ? "…" : "Turn on"}
          </button>
          <button
            type="button"
            aria-label="Dismiss alerts prompt"
            onClick={() => dismiss(LS_ALERTS)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-line"
          >
            ✕
          </button>
        </div>
      )}

      {showInstall && (
        <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-line bg-surface/95 p-2.5 shadow-lg backdrop-blur">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-lg text-white">
            ⬇
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink">Install Caregiver</p>
            <p className="truncate text-[11px] text-muted">
              Full-screen app, works offline
            </p>
          </div>
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="btn btn-primary !px-3 !py-1.5 text-xs"
          >
            {busy ? "…" : "Install"}
          </button>
          <button
            type="button"
            aria-label="Dismiss install prompt"
            onClick={() => dismiss(LS_INSTALL)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-line"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
