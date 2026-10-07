import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { googleEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-extrabold text-ink">Karibu back</h1>
        <p className="mb-6 text-sm text-muted">
          Sign in to continue — clients browse caretakers, workers manage their portal.
        </p>

        {single(sp.registered) && (
          <p className="field-ok mb-4">✓ Account created — sign in to continue.</p>
        )}
        {single(sp.expired) && (
          <p className="field-error mb-4">
            Your session ended — the account may have been removed or signed
            out elsewhere. Sign in again to continue.
          </p>
        )}
        {single(sp.error) && (
          <p className="field-error mb-4">Your session could not be restored, please sign in.</p>
        )}

        <LoginForm next={single(sp.next)} googleEnabled={googleEnabled()} />

        <p className="mt-5 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
