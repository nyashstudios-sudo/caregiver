import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { homeForRole } from "@/lib/roles";
import { LinkConfirm } from "@/components/LinkConfirm";

export const metadata: Metadata = {
  title: "Email confirmed",
  robots: { index: false },
};

/**
 * Where the emailed confirmation link lands. The token travels in the URL
 * hash and is exchanged client-side — this page stays a thin shell.
 */
export default async function WelcomeVerifiedPage() {
  const user = await requireSession("/welcome/verified");
  return (
    <div className="container-page flex min-h-[55vh] items-center justify-center py-12">
      <LinkConfirm homeHref={homeForRole(user.role)} />
    </div>
  );
}
