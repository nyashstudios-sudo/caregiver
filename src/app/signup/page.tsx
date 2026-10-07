import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const roleParam = single(sp.role).toUpperCase();
  const defaultRole = roleParam === "WORKER" ? "WORKER" : "CLIENT";

  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-lg">
        <h1 className="mb-1 text-2xl font-extrabold text-ink">Create your account</h1>
        <p className="mb-6 text-sm text-muted">
          Choose how you want to use the platform — you can start hiring or working right away.
        </p>

        <SignupForm defaultRole={defaultRole} />

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
