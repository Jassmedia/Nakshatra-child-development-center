import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/layout";
import { parseReportParams } from "@/features/reports/params";
import { ReportView } from "@/features/reports/report-view";
import { studentOptions } from "@/features/students/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireRole("admin");
  const { report, filters, allowed } = parseReportParams(await searchParams, "admin");
  const students = await studentOptions(false);
  return (
    <>
      <PageHeader title="Reports" description="Filter by student and dates. Every report can be downloaded as CSV for Excel or Google Sheets." />
      <ReportView basePath="/admin/reports" report={report} filters={filters} allowed={allowed} students={students} />
    </>
  );
}
