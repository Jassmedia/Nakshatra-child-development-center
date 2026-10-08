import type { Metadata } from "next";

import { LinkButton } from "@/components/ui/button";
import { FilterBar, FilterField, FilterInput, FilterSelect, param } from "@/components/ui/filters";
import { EmptyState, PageHeader, Panel, Stat } from "@/components/ui/layout";
import { FeesTable } from "@/features/billing/components/fee-bits";
import { billingSummary, listFees } from "@/features/billing/queries";
import { studentOptions } from "@/features/students/queries";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: PageProps<"/admin/billing">) {
  const sp = await searchParams;
  const status = sp.status === undefined ? "unpaid" : param(sp.status);
  const studentId = param(sp.student);
  const q = param(sp.q);
  const [summary, fees, students] = await Promise.all([
    billingSummary(),
    listFees({ status: status || undefined, studentId: studentId || undefined, q }),
    studentOptions(false),
  ]);
  return (
    <>
      <PageHeader title="Billing" description="Fees and payments. Amounts paid and statuses are calculated from the recorded payments." actions={<LinkButton href="/admin/billing/new">Create fee</LinkButton>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pending amount" value={formatMoney(summary.outstanding)} hint={`${summary.openCount} open fees`} tone={summary.outstanding ? "warn" : undefined} />
        <Stat label="Overdue" value={formatMoney(summary.overdueAmount)} hint={`${summary.overdueCount} fees past due`} tone={summary.overdueCount ? "bad" : undefined} />
        <Stat label="Collected this month" value={formatMoney(summary.collectedThisMonth)} tone="good" />
        <Stat label="Showing" value={fees.length} hint="fees in the list below" />
      </div>
      <FilterBar resetHref="/admin/billing?status=">
        <FilterField label="Search" grow><FilterInput name="q" defaultValue={q} placeholder="Description or fee number" /></FilterField>
        <FilterField label="Student">
          <FilterSelect name="student" defaultValue={studentId}>
            <option value="">All students</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </FilterSelect>
        </FilterField>
        <FilterField label="Status">
          <FilterSelect name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="unpaid">Not fully paid</option>
            <option value="overdue">Overdue</option>
            <option value="pending">Pending</option>
            <option value="partially_paid">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </FilterSelect>
        </FilterField>
      </FilterBar>
      <Panel padded={false}>
        {fees.length === 0 ? <div className="p-4"><EmptyState title="No fees match these filters" /></div> : <FeesTable fees={fees} showStudent hrefFor={(id) => `/admin/billing/${id}`} />}
      </Panel>
    </>
  );
}
