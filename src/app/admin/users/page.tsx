import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { setUserStatusAction, setUserRoleAction } from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: "Manage users (admin)",
  robots: { index: false },
};

const ROLES = ["ALL", "CLIENT", "WORKER", "ADMIN"] as const;

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = single(sp.q).trim();
  const roleFilter = single(sp.role);
  const statusFilter = single(sp.status);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q } },
              { profile: { is: { fullName: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {},
      ROLES.includes(roleFilter as (typeof ROLES)[number]) && roleFilter !== "ALL"
        ? { role: roleFilter as "CLIENT" | "WORKER" | "ADMIN" }
        : {},
      statusFilter === "ACTIVE" || statusFilter === "SUSPENDED"
        ? { status: statusFilter as "ACTIVE" | "SUSPENDED" }
        : {},
    ],
  };

  const users = await prisma.user.findMany({
    where,
    include: {
      profile: { select: { fullName: true, avatarUrl: true, location: true } },
      _count: { select: { clientBookings: true, workerBookings: true, receivedMessages: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const counts = await prisma.user.groupBy({
    by: ["role", "status"],
    _count: true,
  });
  const countOf = (role: string, status: string) =>
    counts.find((c) => c.role === role && c.status === status)?._count ?? 0;

  return (
    <div>
      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Clients</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{countOf("CLIENT", "ACTIVE")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Workers</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{countOf("WORKER", "ACTIVE")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Admins</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{countOf("ADMIN", "ACTIVE")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Suspended</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600 dark:text-red-400">
            {countOf("CLIENT", "SUSPENDED") +
              countOf("WORKER", "SUSPENDED") +
              countOf("ADMIN", "SUSPENDED")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/users" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email or phone…"
          className="input max-w-xs flex-1"
        />
        <select name="role" defaultValue={roleFilter || "ALL"} className="input w-auto">
          <option value="ALL">All roles</option>
          <option value="CLIENT">Clients</option>
          <option value="WORKER">Workers</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select name="status" defaultValue={statusFilter || "ALL"} className="input w-auto">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button type="submit" className="btn btn-primary">Filter</button>
        {(q || roleFilter || statusFilter) && (
          <Link href="/admin/users" className="btn btn-secondary">Clear</Link>
        )}
      </form>

      {single(sp.suspended) && <p className="field-ok mb-4">✓ Account suspended.</p>}
      {single(sp.restored) && <p className="field-ok mb-4">✓ Account restored.</p>}
      {single(sp.rolechanged) && <p className="field-ok mb-4">✓ Role updated.</p>}
      {single(sp.error) && (
        <p className="field-error mb-4">That action could not be completed.</p>
      )}

      {/* Table */}
      {users.length === 0 ? (
        <div className="card p-10 text-center text-muted">No users match these filters.</div>
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Activity</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const name = u.profile?.fullName ?? u.email.split("@")[0];
                const bookings = u._count.clientBookings + u._count.workerBookings;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar src={u.profile?.avatarUrl} name={name} size={36} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{name}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === "ADMIN"
                            ? "badge-navy"
                            : u.role === "WORKER"
                              ? "badge-green"
                              : "badge-slate"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === "ACTIVE" ? "badge-teal" : "badge-red"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {bookings} booking{bookings === 1 ? "" : "s"}
                      <br />
                      {u._count.receivedMessages} msg
                      {u.lastLoginAt ? (
                        <>
                          <br />
                          last seen {u.lastLoginAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </>
                      ) : null}
                    </td>
                    <td className="text-sm text-muted">
                      {u.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td>
                      <div className="flex flex-col items-end gap-1.5">
                        <form action={setUserStatusAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                          <button
                            type="submit"
                            className={u.status === "ACTIVE" ? "btn btn-danger !px-3 !py-1.5 text-xs" : "btn btn-primary !px-3 !py-1.5 text-xs"}
                          >
                            {u.status === "ACTIVE" ? "Suspend" : "Restore"}
                          </button>
                        </form>
                        <div className="flex gap-1.5">
                          {u.role !== "ADMIN" && (
                            <form action={setUserRoleAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="role" value="ADMIN" />
                              <button type="submit" className="btn btn-secondary !px-2.5 !py-1 text-[11px]">
                                Make admin
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Showing {users.length} of up to 200 users. Suspended accounts cannot sign in, send
        messages or appear in the public directory.
      </p>
    </div>
  );
}
