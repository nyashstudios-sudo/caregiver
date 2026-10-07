import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Audit trail (admin)",
  robots: { index: false },
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const ACTION_LABELS: Record<string, string> = {
  "user.suspend": "Suspended account",
  "user.restore": "Restored account",
  "user.promote": "Granted admin role",
  "user.demote": "Removed admin role",
  "user.verify": "Vetted worker",
  "user.unverify": "Removed vetting",
  "user.delete": "Deleted account",
  "credential.approve": "Approved credential",
  "credential.reject": "Rejected credential",
  "booking.cancel": "Force-cancelled booking",
  "booking.refund": "Issued booking refund",
  "payment.refund": "Refunded payment",
  "post.publish": "Published post",
  "post.unpublish": "Unpublished post",
  "post.delete": "Deleted post",
  "review.delete": "Removed review",
  "contact.resolve": "Resolved contact message",
  "contact.delete": "Deleted contact message",
  "setting.update": "Updated platform setting",
  "service.remove": "Removed service listing",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const actionFilter = single(sp.action);

  const [logs, actions] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: actionFilter ? { action: actionFilter } : {},
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { actor: { select: { email: true, profile: { select: { fullName: true } } } } },
    }),
    prisma.adminAuditLog.groupBy({ by: ["action"], _count: true, orderBy: { _count: { action: "desc" } } }),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Audit trail</h2>
          <p className="text-sm text-muted">
            Every privileged action — moderation, vetting, payouts, settings — recorded with
            actor and timestamp. Newest first; last 150 events shown.
          </p>
        </div>
        <form action="/admin/audit" method="get" className="flex items-center gap-2">
          <select name="action" defaultValue={actionFilter || ""} className="input w-auto">
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {ACTION_LABELS[a.action] ?? a.action} ({a._count})
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary">Filter</button>
          {actionFilter && (
            <Link href="/admin/audit" className="btn btn-secondary">Clear</Link>
          )}
        </form>
      </div>

      {single(sp.deleted) && <p className="field-ok mb-4">✓ Review removed and logged.</p>}

      {logs.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          No audit events yet — actions appear here the moment an admin changes something.
        </div>
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-sm text-muted">
                    {log.createdAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="text-sm font-semibold">
                    {log.actor?.profile?.fullName ?? log.actor?.email ?? "system"}
                  </td>
                  <td>
                    <span className="badge badge-slate">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="max-w-[10rem] truncate text-sm text-muted">
                    {log.targetType ? `${log.targetType}` : "—"}
                    {log.targetId ? ` · ${log.targetId.slice(0, 10)}…` : ""}
                  </td>
                  <td className="max-w-[18rem] truncate text-xs text-muted">
                    {log.meta ? JSON.stringify(log.meta) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
