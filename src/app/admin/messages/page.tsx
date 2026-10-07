import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Messages (admin)",
  robots: { index: false },
};

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-ink">
        {messages.length} message{messages.length === 1 ? "" : "s"}
      </h2>

      {messages.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No messages yet — ones sent via the Contact Us page will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{message.name}</p>
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
              <a href={`mailto:${message.email}`} className="btn btn-secondary mt-3">
                Reply by email
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
