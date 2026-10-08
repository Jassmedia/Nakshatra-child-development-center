import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/layout";
import { parseReportParams } from "@/features/reports/params";
import { ReportView } from "@/features/reports/report-view";
import { studentOptions } from "@/features/students/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/staff/reports">) {
  await requireRole("staff");
  const { report, filters, allowed } = parseReportParams(await searchParams, "staff");
  const students = await studentOptions(false);
  return (
    <>
      <PageHeader title="Reports" description="Reports for the children assigned to you. Download as CSV for Excel or Google Sheets." />
      <ReportView basePath="/staff/reports" report={report} filters={filters} allowed={allowed} students={students} />
    </>
  );
}
