import Link from "next/link";

import { EmptyState, Panel, Stat } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { cn, formatDate, formatMoney } from "@/lib/utils";

import { isFeeOverdue, rupees, studentFees } from "../queries";
import { FeesTable } from "./fee-bits";

export async function StudentFeesView({ studentId, role }: { studentId: string; role: "admin" | "parent" }) {
  const fees = await studentFees(studentId);
  const open = fees.filter((f) => f.status === "pending" || f.status === "partially_paid");
  const pending = rupees(open.reduce((s, f) => s + Number(f.balance), 0));
  const overdue = rupees(open.filter((f) => isFeeOverdue(f)).reduce((s, f) => s + Number(f.balance), 0));
  const payments = fees
    .flatMap((f) => f.payments.map((p) => ({ ...p, feeTitle: f.title })))
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const paidTotal = rupees(payments.filter((p) => !p.voided).reduce((s, p) => s + Number(p.amount), 0));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Pending amount" value={formatMoney(pending)} tone={pending ? "warn" : "good"} hint={open.length ? `${open.length} open ${open.length === 1 ? "fee" : "fees"}` : "Nothing due"} />
        <Stat label="Overdue" value={formatMoney(overdue)} tone={overdue ? "bad" : undefined} />
        <Stat label="Paid so far" value={formatMoney(paidTotal)} tone="good" />
      </div>
      {role === "admin" ? (
        <div><LinkButton href={`/admin/billing/new?student=${studentId}`}>Create a fee</LinkButton></div>
      ) : null}
      <Panel title="Fees" padded={false}>
        {fees.length === 0 ? (
          <div className="p-4"><EmptyState title="No fees yet" /></div>
        ) : (
          <FeesTable fees={fees} hrefFor={role === "admin" ? (id) => `/admin/billing/${id}` : undefined} />
        )}
      </Panel>
      <Panel title="Payment history">
        {payments.length === 0 ? (
          <p className="text-sm text-ink-400">No payments recorded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className={cn("flex flex-wrap items-baseline justify-between gap-2 py-2.5", p.voided && "text-ink-300 line-through")}>
                <span>
                  <span className="font-bold tabular-nums">{formatMoney(p.amount)}</span>{" "}
                  <span className="text-sm">{PAYMENT_METHOD_LABEL[p.method]}, {formatDate(p.payment_date)}</span>
                  <span className="block text-xs text-ink-400">{p.feeTitle}{p.reference ? `, ref ${p.reference}` : ""}</span>
                </span>
                {!p.voided ? (
                  <Link href={`/receipts/${p.id}`} className="text-sm font-bold text-ink-600 no-underline hover:underline">Receipt {p.receipt_number}</Link>
                ) : (
                  <span className="text-xs">Voided</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
