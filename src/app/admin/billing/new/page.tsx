import type { Metadata } from "next";

import { BackLink } from "@/components/ui/back-link";
import { param } from "@/components/ui/filters";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { PageHeader, Panel } from "@/components/ui/layout";
import { createFee } from "@/features/billing/actions";
import { studentOptions } from "@/features/students/queries";
import { addDays, todayIST } from "@/lib/utils";

export const metadata: Metadata = { title: "Create fee" };

export default async function NewFeePage({ searchParams }: PageProps<"/admin/billing/new">) {
  const student = param((await searchParams).student);
  const students = await studentOptions();
  const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <>
      <PageHeader title="Create a fee" back={<BackLink href="/admin/billing">Billing</BackLink>} />
      <Panel className="max-w-2xl">
        <ActionForm action={createFee}>
          <Field label="Student" name="student_id">
            <Select name="student_id" defaultValue={student}>
              <option value="">Choose…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
            </Select>
          </Field>
          <Checkbox name="all_active" label="Create this fee for ALL active students instead" />
          <Field label="Description" name="title" required>
            <Input name="title" defaultValue={`${month} therapy fee`} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₹)" name="amount" required><Input name="amount" inputMode="decimal" placeholder="e.g. 6000" /></Field>
            <Field label="Discount (₹)" name="discount"><Input name="discount" inputMode="decimal" placeholder="0" /></Field>
            <Field label="Period from" name="period_start"><Input name="period_start" type="date" /></Field>
            <Field label="Period to" name="period_end"><Input name="period_end" type="date" /></Field>
            <Field label="Due date" name="due_date" required><Input name="due_date" type="date" defaultValue={addDays(todayIST(), 10)} /></Field>
          </div>
          <Field label="Remarks" name="remarks"><Textarea name="remarks" rows={2} /></Field>
          <div><SubmitButton>Create fee</SubmitButton></div>
        </ActionForm>
      </Panel>
    </>
  );
}
