import { addDays, todayIST } from "@/lib/utils";

import { isReportKey, REPORTS, type ReportKey } from "./definitions";
import type { ReportFilters } from "./queries";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/** Reads and validates report params from the URL. Billing reports only for admins. */
export function parseReportParams(
  sp: Record<string, string | string[] | undefined>,
  role: "admin" | "staff",
): { report: ReportKey; filters: ReportFilters; allowed: ReportKey[] } {
  const allowed = (Object.keys(REPORTS) as ReportKey[]).filter((k) => role === "admin" || !REPORTS[k].billing);
  const raw = typeof sp.report === "string" ? sp.report : "";
  const report = isReportKey(raw) && allowed.includes(raw) ? raw : "attendance";
  const today = todayIST();
  let from = typeof sp.from === "string" && DATE.test(sp.from) ? sp.from : `${today.slice(0, 7)}-01`;
  let to = typeof sp.to === "string" && DATE.test(sp.to) ? sp.to : today;
  if (from > to) [from, to] = [to, from];
  // Keep ranges sensible (max ~2 years).
  if (from < addDays(to, -731)) from = addDays(to, -731);
  const studentId = typeof sp.student === "string" && UUID.test(sp.student) ? sp.student : undefined;
  return { report, filters: { from, to, studentId }, allowed };
}
