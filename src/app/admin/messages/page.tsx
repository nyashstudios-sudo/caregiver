import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  setContactHandledAction,
  deleteContactMessageAction,
} from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: "Contact inbox (admin)",
  robots: { index: false },
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = single(sp.tab) === "closed" ? "closed" : "open";

  const [messages, openCount, closedCount] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      where: tab === "open" ? { handledAt: null } : { handledAt: { not: null } },
      take: 200,
    }),
    prisma.contactMessage.count({ where: { handledAt: null } }),
    prisma.contactMessage.count({ where: { handledAt: { not: null } } }),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link
            href="/admin/messages"
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === "open"
                ? "border-brand bg-brand text-white dark:text-[#04231f]"
                : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
            }`}
          >
            Open ({openCount})
          </Link>
          <Link
            href="/admin/messages?tab=closed"
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === "closed"
                ? "border-brand bg-brand text-white dark:text-[#04231f]"
                : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
            }`}
          >
            Resolved ({closedCount})
          </Link>
        </div>
        <Link href="/admin/users" className="btn btn-secondary">
          User management →
        </Link>
      </div>

      {single(sp.deleted) && <p className="field-ok mb-4">✓ Message deleted.</p>}

      {messages.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          {tab === "open"
            ? "No open messages — everything from the Contact Us page has been handled. 🎉"
            : "No resolved messages yet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">
                    {message.name}{" "}
                    {message.handledAt && <span className="badge badge-green">Resolved</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {message.email}
                    {message.phone && ` · ${message.phone}`}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {message.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.subject && (
                <p className="mt-2 text-sm font-semibold text-ink">{message.subject}</p>
              )}
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {message.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`mailto:${message.email}`} className="btn btn-secondary">
                  Reply by email
                </a>
                <form action={setContactHandledAction}>
                  <input type="hidden" name="id" value={message.id} />
                  <input type="hidden" name="handled" value={message.handledAt ? "0" : "1"} />
                  <button type="submit" className="btn btn-primary">
                    {message.handledAt ? "Reopen" : "Mark resolved"}
                  </button>
                </form>
                <form action={deleteContactMessageAction}>
                  <input type="hidden" name="id" value={message.id} />
                  <button type="submit" className="btn btn-danger">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
