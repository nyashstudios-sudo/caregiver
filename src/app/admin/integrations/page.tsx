import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { darajaConfigured } from "@/lib/daraja";
import { googleEnabled } from "@/lib/auth";
import { emailDeliveryConfigured } from "@/lib/verify";

export const metadata: Metadata = {
  title: "Integrations (admin)",
  robots: { index: false },
};

type Card = {
  name: string;
  purpose: string;
  ok: boolean;
  okLabel: string;
  waitLabel: string;
  envVars: string[];
  docs?: string;
};

export default async function AdminIntegrationsPage() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const storageOk = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const cards: Card[] = [
    {
      name: "Supabase Postgres",
      purpose:
        "Primary data store — users, bookings, payments, content. Migrations run automatically on every deploy.",
      ok: dbOk,
      okLabel: "Connected",
      waitLabel: "Unreachable",
      envVars: ["DATABASE_URL", "DIRECT_URL"],
    },
    {
      name: "Supabase Storage",
      purpose: "Avatars, certificates and portfolio images served through /api/files.",
      ok: storageOk,
      okLabel: "Configured",
      waitLabel: "Missing keys",
      envVars: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STORAGE_BUCKET"],
      docs: "https://supabase.com/docs/guides/storage",
    },
    {
      name: "Email verification",
      purpose:
        "Supabase delivers the signup verification code/link; the welcome page confirms it back into the account.",
      ok: emailDeliveryConfigured(),
      okLabel: "Delivery armed",
      waitLabel: "Not configured",
      envVars: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      docs: "https://supabase.com/docs/guides/auth",
    },
    {
      name: "Safaricom Daraja (M-Pesa)",
      purpose: "STK Push for booking payments and B2C for wallet withdrawals.",
      ok: darajaConfigured(),
      okLabel: "Live rail",
      waitLabel: "Sandbox keys missing",
      envVars: [
        "DARAJA_ENV",
        "DARAJA_CONSUMER_KEY",
        "DARAJA_CONSUMER_SECRET",
        "DARAJA_PASSKEY",
        "DARAJA_SHORTCODE",
        "DARAJA_CALLBACK_URL",
        "DARAJA_B2C_INITIATOR",
        "DARAJA_B2C_SECURITY_CREDENTIAL",
      ],
      docs: "https://developer.safaricom.co.ke",
    },
    {
      name: "Google sign-in",
      purpose: "OAuth button on login and signup once Google OAuth credentials are set.",
      ok: googleEnabled(),
      okLabel: "Enabled",
      waitLabel: "Disabled (env-gated)",
      envVars: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
      docs: "https://console.cloud.google.com/apis/credentials",
    },
    {
      name: "Public site URL",
      purpose: "Drives canonical tags, sitemap, robots and OG images — must match the live domain.",
      ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")),
      okLabel: process.env.NEXT_PUBLIC_SITE_URL ?? "unset",
      waitLabel: "Set NEXT_PUBLIC_SITE_URL",
      envVars: ["NEXT_PUBLIC_SITE_URL"],
    },
  ];

  const configured = cards.filter((c) => c.ok).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Integration status</h2>
          <p className="text-sm text-muted">
            Live health of every external dependency this platform leans on — {configured} of{" "}
            {cards.length} ready. Values are never shown here, only whether the wiring exists.
          </p>
        </div>
        <span className={`badge ${configured === cards.length ? "badge-green" : "badge-amber"}`}>
          {configured}/{cards.length} online
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className="card flex flex-col p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-bold text-ink">{card.name}</h3>
              <span className={`badge ${card.ok ? "badge-green" : "badge-amber"} shrink-0`}>
                {card.ok ? "●" : "○"} {card.ok ? card.okLabel : card.waitLabel}
              </span>
            </div>
            <p className="mb-3 flex-1 text-sm text-muted">{card.purpose}</p>
            <div className="flex flex-wrap gap-1.5">
              {card.envVars.map((v) => (
                <code
                  key={v}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {v}
                </code>
              ))}
            </div>
            {card.docs && (
              <a
                href={card.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-xs font-semibold text-brand hover:underline"
              >
                Setup docs ↗
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="card p-5 text-sm text-muted">
        <p className="font-semibold text-ink">Monetization &amp; webhook notes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Platform commission is editable under <strong>Payments</strong> — it overrides the{" "}
            <code>PLATFORM_FEE_PCT</code> environment fallback.
          </li>
          <li>
            M-Pesa callbacks must reach <code>/api/payments/daraja</code> — set{" "}
            <code>DARAJA_CALLBACK_URL</code> to the full production URL.
          </li>
          <li>Rotating any env var requires a redeploy before it takes effect.</li>
        </ul>
      </div>
    </div>
  );
}
