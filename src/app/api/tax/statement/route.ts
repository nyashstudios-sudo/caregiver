/**
 * GET /api/tax/statement?year=2026 — downloadable withholding-tax records
 * for the signed-in worker (KRA filing support). Never caches, never leaks:
 * only the session owner's own rows, one year at a time.
 */

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (user.role !== "WORKER") {
    return Response.json({ error: "Statements are for worker accounts" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  if (!/^\d{4}$/.test(year)) {
    return Response.json({ error: "year must be YYYY" }, { status: 400 });
  }

  const rows = await prisma.taxWithholding.findMany({
    where: { workerId: user.id, period: { startsWith: `${year}-` } },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });

  const header = [
    "period",
    "booking_id",
    "gross_kes",
    "platform_fee_kes",
    "wht_rate_pct",
    "tax_withheld_kes",
    "net_paid_kes",
    "withheld_on",
  ];
  const lines = rows.map((r) =>
    [
      r.period,
      r.bookingId ?? "",
      r.gross.toFixed(2),
      r.fee.toFixed(2),
      r.whtRate.toFixed(2),
      r.whtAmount.toFixed(2),
      r.net.toFixed(2),
      r.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [header.join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="caregiver-tax-statement-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
