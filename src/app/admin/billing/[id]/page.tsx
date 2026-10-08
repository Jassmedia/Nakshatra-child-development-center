import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { Details, EmptyState, PageHeader, Panel, Table, Td, Th } from "@/components/ui/layout";
import { cancelFee, recordPayment, updateFee, voidPayment } from "@/features/billing/actions";
import { FeeStatus } from "@/features/billing/components/fee-bits";
import { getFee } from "@/features/billing/queries";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS } from "@/lib/constants";
import { cn, formatDate, formatMoney, todayIST } from "@/lib/utils";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Fee" };

export default async function FeePage({ params }: PageProps<"/admin/billing/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const fee = await getFee(id);
  if (!fee) notFound();
  const open = fee.status === "pending" || fee.status === "partially_paid";
  const net = Number(fee.amount) - Number(fee.discount);

  return (
    <>
      <PageHeader
        title={fee.title}
        back={<BackLink href="/admin/billing">Billing</BackLink>}
        description={<>{fee.fee_number} for <Link href={`/admin/students/${fee.student?.id}/fees`} className="font-bold text-ink-600 hover:underline">{fee.student?.full_name}</Link></>}
        actions={<FeeStatus fee={fee} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Summary">
            <Details
              items={[
                ["Amount", formatMoney(fee.amount)],
                ["Discount", formatMoney(fee.discount)],
                ["Payable", formatMoney(net)],
                ["Paid", formatMoney(fee.amount_paid)],
                ["Pending amount", <strong key="b">{fee.status === "cancelled" ? "—" : formatMoney(fee.balance)}</strong>],
                ["Due date", formatDate(fee.due_date)],
                ["Period", fee.period_start ? `${formatDate(fee.period_start)} to ${formatDate(fee.period_end)}` : "—"],
                ["Remarks", fee.remarks],
                ...(fee.cancelled_reason ? ([["Cancelled because", fee.cancelled_reason]] as Array<[string, string]>) : []),
              ]}
            />
          </Panel>
          <Panel title="Payments" padded={false}>
            {fee.payments.length === 0 ? (
              <div className="p-4"><EmptyState title="No payments yet" /></div>
            ) : (
              <Table>
                <thead><tr><Th>Receipt</Th><Th>Date</Th><Th>Method</Th><Th className="text-right">Amount</Th><Th>Remarks</Th><Th></Th></tr></thead>
                <tbody>
                  {fee.payments.map((p) => (
                    <tr key={p.id} className={cn(p.voided && "text-ink-300")}>
                      <Td>{p.voided ? <s>{p.receipt_number}</s> : <Link href={`/receipts/${p.id}`} className="font-bold text-ink-600 hover:underline">{p.receipt_number}</Link>}</Td>
                      <Td>{formatDate(p.payment_date)}</Td>
                      <Td>{PAYMENT_METHOD_LABEL[p.method]}{p.reference ? <span className="block text-xs text-ink-400">{p.reference}</span> : null}</Td>
                      <Td className="text-right tabular-nums">{p.voided ? <s>{formatMoney(p.amount)}</s> : formatMoney(p.amount)}</Td>
                      <Td>{p.voided ? `Voided: ${p.void_reason}` : (p.remarks ?? "")}</Td>
                      <Td>
                        {!p.voided ? (
                          <details>
                            <summary className="cursor-pointer text-sm font-bold text-rose-800">Void</summary>
                            <ActionForm action={voidPayment} className="mt-2 w-56">
                              <input type="hidden" name="id" value={p.id} />
                              <Field label="Reason" name="void_reason"><Input name="void_reason" /></Field>
                              <SubmitButton size="sm" variant="danger">Void payment</SubmitButton>
                            </ActionForm>
                          </details>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          {open ? (
            <Panel title="Record a payment">
              <ActionForm action={recordPayment} resetOnSuccess>
                <input type="hidden" name="fee_id" value={fee.id} />
                <Field label="Amount (₹)" name="amount" required hint={`Pending: ${formatMoney(fee.balance)}`}>
                  <Input name="amount" inputMode="decimal" defaultValue={String(fee.balance ?? "")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Payment date" name="payment_date" required><Input name="payment_date" type="date" defaultValue={todayIST()} max={todayIST()} /></Field>
                  <Field label="Method" name="method" required>
                    <Select name="method" defaultValue="upi">
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Reference" name="reference" hint="UPI / transaction id, cheque number"><Input name="reference" /></Field>
                <Field label="Payment remarks" name="remarks"><Textarea name="remarks" rows={2} /></Field>
                <div><SubmitButton>Record payment</SubmitButton></div>
              </ActionForm>
            </Panel>
          ) : null}
          {fee.status !== "cancelled" ? (
            <Panel title="Edit fee">
              <ActionForm action={updateFee}>
                <input type="hidden" name="id" value={fee.id} />
                <Field label="Description" name="title" required><Input name="title" defaultValue={fee.title} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Amount (₹)" name="amount" required><Input name="amount" inputMode="decimal" defaultValue={String(fee.amount)} /></Field>
                  <Field label="Discount (₹)" name="discount"><Input name="discount" inputMode="decimal" defaultValue={String(fee.discount)} /></Field>
                  <Field label="Period from" name="period_start"><Input name="period_start" type="date" defaultValue={fee.period_start ?? ""} /></Field>
                  <Field label="Period to" name="period_end"><Input name="period_end" type="date" defaultValue={fee.period_end ?? ""} /></Field>
                  <Field label="Due date" name="due_date" required><Input name="due_date" type="date" defaultValue={fee.due_date} /></Field>
                </div>
                <Field label="Remarks" name="remarks"><Textarea name="remarks" rows={2} defaultValue={fee.remarks ?? ""} /></Field>
                <div><SubmitButton variant="secondary">Save fee</SubmitButton></div>
              </ActionForm>
            </Panel>
          ) : null}
          {open && Number(fee.amount_paid) === 0 ? (
            <Panel title="Cancel this fee">
              <ActionForm action={cancelFee}>
                <input type="hidden" name="id" value={fee.id} />
                <Field label="Reason" name="cancelled_reason" hint="e.g. Waived, created by mistake"><Input name="cancelled_reason" /></Field>
                <div><SubmitButton variant="danger">Cancel fee</SubmitButton></div>
              </ActionForm>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
