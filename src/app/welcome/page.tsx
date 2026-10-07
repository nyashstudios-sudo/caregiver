import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { homeForRole } from "@/lib/roles";
import { WelcomeVerify } from "@/components/WelcomeVerify";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false },
};

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${"•".repeat(Math.max(name.length - head.length, 1))}@${domain}`;
}

/**
 * The post-signup welcome screen. One job: confirm the address (code entry,
 * resend, or the emailed link via /welcome/verified) while making the new
 * member feel expected — then route them into the right role home.
 */
export default async function WelcomePage() {
  const user = await requireSession("/welcome");
  const homeHref = homeForRole(user.role);
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerifiedAt: true },
  });
  const alreadyVerified = Boolean(account?.emailVerifiedAt);

  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-brand to-brand-strong text-4xl text-white shadow-xl shadow-brand/25">
          {alreadyVerified ? "✓" : "✉️"}
        </div>

        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
          {alreadyVerified ? "You're all set!" : "Welcome to Caregiver"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {alreadyVerified ? (
            <>
              Your email is verified — {user.name ?? "your account"} is live on the platform.
              Jump back in whenever you&apos;re ready.
            </>
          ) : (
            <>
              One quick step: we sent a verification code to{" "}
              <span className="font-semibold text-ink">{maskEmail(user.email)}</span>. Verifying
              keeps the platform trustworthy for everyone.
            </>
          )}
        </p>

        <div className="mt-6 text-left">
          {alreadyVerified ? (
            <div className="card space-y-3 p-6 text-center">
              <p className="text-sm text-muted">
                Verified accounts can book faster, publish services and receive platform
                alerts.
              </p>
              <a href={homeHref} className="btn btn-primary w-full">
                Continue to your home →
              </a>
            </div>
          ) : (
            <WelcomeVerify email={maskEmail(user.email)} homeHref={homeHref} />
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
          <span>Step 1 of 2 — verify email</span>
          <span className="h-1 w-16 rounded-full bg-line">
            <span className="block h-1 w-1/2 rounded-full bg-brand" />
          </span>
        </div>
      </div>
    </div>
  );
}
