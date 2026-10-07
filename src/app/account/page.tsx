import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import {
  AccountDetailsForm,
  ChangePasswordForm,
  PreferencesForm,
  DeleteAccountForm,
} from "@/components/AccountForms";

export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false },
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Client",
  WORKER: "Caretaker",
  ADMIN: "Administrator",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession("/account");
  const sp = await searchParams;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });
  // The account vanished between guard and fetch — clear the stale cookie.
  if (!record) redirect("/api/session-expired");

  const profile = record.profile;
  const memberSince = record.createdAt.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="container-page py-8 sm:py-10">
      {/* Header band */}
      <div className="page-hero-navy mb-6">
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <Avatar
            src={profile?.avatarUrl}
            name={profile?.fullName ?? record.email}
            size={72}
            className="ring-4 ring-white/20"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
              Account settings
            </p>
            <h1 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">
              {profile?.fullName ?? record.email}
            </h1>
            <p className="mt-1 text-sm text-white/75">
              {ROLE_LABEL[record.role]} · Joined {memberSince} · {record.status === "ACTIVE" ? "Active" : "Suspended"}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {record.role === "WORKER" && (
              <Link href="/worker" className="btn btn-primary">
                Edit my services
              </Link>
            )}
            {record.role === "CLIENT" && (
              <Link href="/caretakers" className="btn btn-primary">
                Find caretakers
              </Link>
            )}
            {record.role === "ADMIN" && (
              <Link href="/admin" className="btn btn-primary">
                Admin dashboard
              </Link>
            )}
            <Link href="/messages" className="btn btn-secondary !border-white/30 !bg-white/10 !text-white hover:!bg-white/20">
              Messages
            </Link>
          </div>
        </div>
      </div>

      {single(sp.saved) === "details" && (
        <p className="field-ok mb-4">✓ Profile details saved.</p>
      )}
      {single(sp.saved) === "password" && (
        <p className="field-ok mb-4">✓ Password updated — use it next time you sign in.</p>
      )}
      {single(sp.saved) === "prefs" && (
        <p className="field-ok mb-4">✓ Preferences saved.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left column: profile details */}
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Profile details</h2>
            <p className="mt-1 text-sm text-muted">
              Shown on your bookings and messages. {record.role === "WORKER" && "Rates and skills live in the worker portal."}
            </p>
            <div className="mt-5">
              <AccountDetailsForm
                fullName={profile?.fullName ?? ""}
                location={profile?.location ?? ""}
                phone={record.phone ?? ""}
                bio={profile?.bio ?? ""}
                avatarUrl={profile?.avatarUrl ?? ""}
              />
            </div>
          </section>
        </div>

        {/* Right column: preferences, security, danger zone */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg font-bold text-ink">Quick links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href={`/profile/${record.id}`} className="font-semibold text-brand hover:underline">
                  👤 My public profile
                </Link>
                <span className="text-muted"> — how others see you</span>
              </li>
              <li>
                <Link href="/wallet" className="font-semibold text-brand hover:underline">
                  💰 Wallet
                </Link>
                <span className="text-muted"> — balances, payments & M-Pesa withdrawals</span>
              </li>
              <li>
                <Link href="/messages" className="font-semibold text-brand hover:underline">
                  ✉️ Messages
                </Link>
                <span className="text-muted"> — talk to caretakers and clients</span>
              </li>
              <li>
                <Link href="/dashboard" className="font-semibold text-brand hover:underline">
                  📅 Bookings
                </Link>
                <span className="text-muted"> — track your requests</span>
              </li>
              <li>
                <Link href="/faq" className="font-semibold text-brand hover:underline">
                  ❓ Help centre
                </Link>
                <span className="text-muted"> — answers to common questions</span>
              </li>
            </ul>
          </section>

          <SecuritySection
            notifyByEmail={record.notifyByEmail}
            role={record.role}
          />
        </div>
      </div>
    </div>
  );
}

function SecuritySection({
  notifyByEmail,
  role,
}: {
  notifyByEmail: boolean;
  role: string;
}) {
  return (
    <>
      <section className="card p-5">
        <h2 className="text-lg font-bold text-ink">Notifications</h2>
        <p className="mt-1 text-sm text-muted">
          We email you when a caretaker accepts your booking, a client books you, or the team
          replies to your message.
        </p>
        <div className="mt-4">
          <PreferencesForm notifyByEmail={notifyByEmail} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold text-ink">Change password</h2>
        <p className="mt-1 text-sm text-muted">Use at least 8 characters you don&apos;t use elsewhere.</p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>

      {role !== "ADMIN" && (
        <section className="card border-red-200 p-5 dark:border-red-900">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Danger zone</h2>
          <p className="mt-1 text-sm text-muted">
            Deleting your account removes your profile, messages and booking history. This
            cannot be undone.
          </p>
          <div className="mt-4">
            <DeleteAccountForm />
          </div>
        </section>
      )}
    </>
  );
}
