import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { AdminTabs } from "@/components/AdminTabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Admin dashboard
          </h1>
        </div>
        <Link href="/" className="btn btn-secondary">
          View site ↗
        </Link>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
