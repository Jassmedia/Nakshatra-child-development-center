import { NextResponse, type NextRequest } from "next/server";

import { REPORTS } from "@/features/reports/definitions";
import { parseReportParams } from "@/features/reports/params";
import { runReport, toCsv } from "@/features/reports/queries";
import { getCurrentUser } from "@/lib/auth/session";

/** CSV download of the same report the page shows (same filters, same RLS). */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "staff") return new NextResponse("Not allowed", { status: 403 });
  const { report, filters } = parseReportParams(Object.fromEntries(request.nextUrl.searchParams), "staff");
  const csv = toCsv(await runReport(report, filters));
  const name = `${REPORTS[report].label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}_${filters.from}_to_${filters.to}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
