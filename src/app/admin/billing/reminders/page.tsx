import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/ui/back-link";
import { ActionForm, Checkbox, Field, Input, SubmitButton } from "@/components/ui/form";
import { Badge, EmptyState, PageHeader, Panel, Table, Td, Th } from "@/components/ui/layout";
import { runRemindersNow, saveReminderSettings } from "@/features/billing/reminders";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Payment reminders" };

const KIND: Record<string, string> = { before_due: "Before due date", due_today: "On due date", overdue: "Overdue" };

export default async function RemindersPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: log }] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).single(),
    supabase
      .from("payment_reminders")
      .select("id, kind, sent_on, recipients, fee:fees(id, title, fee_number), student:students(full_name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <>
      <PageHeader
        title="Automatic payment reminders"
        back={<BackLink href="/admin/billing">Billing</BackLink>}
        description="Parents with a login get an in-app reminder before the due date, on the due date, and repeatedly while a fee is overdue. The check runs every morning at 9:00."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Settings">
            <ActionForm action={saveReminderSettings}>
              <Checkbox name="reminders_enabled" label="Send reminders automatically" defaultChecked={settings?.reminders_enabled ?? true} />
              <Field label="Remind this many days before the due date" name="reminder_days_before">
                <Input name="reminder_days_before" type="number" min={1} max={30} defaultValue={settings?.reminder_days_before ?? 3} />
              </Field>
              <Field label="While overdue, remind again every … days" name="overdue_repeat_days">
                <Input name="overdue_repeat_days" type="number" min={1} max={60} defaultValue={settings?.overdue_repeat_days ?? 7} />
              </Field>
              <div><SubmitButton>Save settings</SubmitButton></div>
            </ActionForm>
          </Panel>
          <Panel title="Run the check now">
            <ActionForm action={runRemindersNow}>
              <p className="text-sm text-ink-500">Safe to press any time: a reminder is never sent twice for the same fee and day.</p>
              <div><SubmitButton variant="secondary" pendingText="Checking…">Send due reminders now</SubmitButton></div>
            </ActionForm>
          </Panel>
        </div>
        <Panel title="Recently sent" padded={false}>
          {!log?.length ? (
            <div className="p-4"><EmptyState title="No reminders sent yet" /></div>
          ) : (
            <Table>
              <thead><tr><Th>Date</Th><Th>Student</Th><Th>Fee</Th><Th>Type</Th><Th>Reached</Th></tr></thead>
              <tbody>
                {log.map((r) => (
                  <tr key={r.id}>
                    <Td>{formatDate(r.sent_on)}</Td>
                    <Td>{r.student?.full_name}</Td>
                    <Td><Link href={`/admin/billing/${r.fee?.id}`} className="font-bold text-ink-600 hover:underline">{r.fee?.title}</Link></Td>
                    <Td>{KIND[r.kind]}</Td>
                    <Td>{r.recipients ? `${r.recipients} parent${r.recipients === 1 ? "" : "s"}` : <Badge tone="warn">No parent login: call them</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
