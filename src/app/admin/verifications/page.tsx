import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { reviewCredentialAction, setUserVerifiedAction } from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: "Vetting queue (admin)",
  robots: { index: false },
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const [pendingCerts, reviewedCerts, unverifiedWorkers, verifiedWorkers] = await Promise.all([
    prisma.certification.findMany({
      where: { status: "PENDING" },
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        caretakerDetails: {
          include: {
            profile: { include: { user: { select: { id: true, email: true, status: true } } } },
          },
        },
      },
    }),
    prisma.certification.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { reviewedAt: "desc" },
      take: 15,
      include: {
        caretakerDetails: {
          include: { profile: { include: { user: { select: { email: true } } } } },
        },
      },
    }),
    prisma.profile.findMany({
      where: { verifiedAt: null, user: { role: "WORKER", status: "ACTIVE" } },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        user: { select: { id: true, email: true, createdAt: true } },
        caretakerDetails: {
          include: { certifications: { select: { status: true } } },
        },
      },
    }),
    prisma.profile.findMany({
      where: { verifiedAt: { not: null }, user: { role: "WORKER" } },
      orderBy: { verifiedAt: "desc" },
      take: 15,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      {single(sp.reviewed) && (
        <p className="field-ok">✓ Credential decision recorded and logged.</p>
      )}
      {single(sp.verified) && (
        <p className="field-ok">
          ✓ Worker {single(sp.verified) === "1" ? "marked as vetted" : "vetting removed"}.
        </p>
      )}
      {single(sp.error) && <p className="field-error">That action could not be completed.</p>}

      {/* ── Credential documents ─────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Credentials awaiting review</h2>
            <p className="text-sm text-muted">
              Certificates uploaded by workers. Approve to count them toward the worker&apos;s
              public credential badge; reject with a note they will see in their portal.
            </p>
          </div>
          <span className="badge badge-amber shrink-0">{pendingCerts.length} pending</span>
        </div>

        {pendingCerts.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            Nothing waiting — every uploaded credential has been reviewed. 🎉
          </div>
        ) : (
          <ul className="space-y-4">
            {pendingCerts.map((cert) => {
              const profile = cert.caretakerDetails.profile;
              const worker = profile.user;
              return (
                <li key={cert.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar src={profile.avatarUrl} name={profile.fullName} size={44} />
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{cert.title}</p>
                        <p className="text-sm text-muted">
                          {profile.fullName} · uploaded{" "}
                          {formatDate(cert.issuedAt ?? cert.caretakerDetails.profile.createdAt)}
                        </p>
                        <p className="text-xs text-muted">{worker.email}</p>
                      </div>
                    </div>
                    <a
                      href={cert.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary shrink-0"
                    >
                      Open document ↗
                    </a>
                  </div>

                  <form action={reviewCredentialAction} className="mt-4 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={cert.id} />
                    <div className="min-w-[14rem] flex-1">
                      <label className="label" htmlFor={`note-${cert.id}`}>
                        Review note <span className="font-normal text-muted">(shown if rejected)</span>
                      </label>
                      <input
                        id={`note-${cert.id}`}
                        name="note"
                        className="input"
                        placeholder="e.g. blurry scan — re-upload the front page"
                        maxLength={300}
                      />
                    </div>
                    <button
                      type="submit"
                      name="decision"
                      value="APPROVED"
                      className="btn btn-primary"
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="REJECTED"
                      className="btn btn-danger"
                    >
                      Reject
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Workers awaiting identity vetting ────────────────────── */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Workers awaiting vetting</h2>
            <p className="text-sm text-muted">
              Confirming identity and qualifications flips the public ✓ Vetted badge on their
              profile and caretaker page.
            </p>
          </div>
          <span className="badge badge-amber shrink-0">{unverifiedWorkers.length} waiting</span>
        </div>

        {unverifiedWorkers.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            Every active worker has been vetted.
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Location</th>
                  <th>Credentials</th>
                  <th>Joined</th>
                  <th className="text-right">Decision</th>
                </tr>
              </thead>
              <tbody>
                {unverifiedWorkers.map((p) => {
                  const approved =
                    p.caretakerDetails?.certifications.filter((c) => c.status === "APPROVED")
                      .length ?? 0;
                  const total = p.caretakerDetails?.certifications.length ?? 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <p className="font-semibold">{p.fullName}</p>
                        <p className="text-xs text-muted">{p.user.email}</p>
                      </td>
                      <td className="text-sm text-muted">{p.location}</td>
                      <td className="text-sm text-muted">
                        {approved}/{total} approved
                      </td>
                      <td className="text-sm text-muted">{formatDate(p.createdAt)}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <form action={setUserVerifiedAction}>
                            <input type="hidden" name="id" value={p.user.id} />
                            <input type="hidden" name="verified" value="1" />
                            <button type="submit" className="btn btn-primary !px-3 !py-1.5 text-xs">
                              Mark vetted
                            </button>
                          </form>
                          <Link href={`/caretakers`} className="btn btn-secondary !px-3 !py-1.5 text-xs">
                            Review listing
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Decision history ─────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Recent decisions</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Credential reviews
            </p>
            {reviewedCerts.length === 0 ? (
              <p className="text-sm text-muted">No reviews recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {reviewedCerts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">{c.title}</span>{" "}
                      <span className="text-muted">
                        — {c.caretakerDetails.profile.fullName}
                      </span>
                    </span>
                    <span
                      className={`badge shrink-0 ${c.status === "APPROVED" ? "badge-green" : "badge-red"}`}
                    >
                      {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Vetted workers
            </p>
            {verifiedWorkers.length === 0 ? (
              <p className="text-sm text-muted">No workers vetted yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {verifiedWorkers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold">{p.fullName}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {p.verifiedAt ? formatDate(p.verifiedAt) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
