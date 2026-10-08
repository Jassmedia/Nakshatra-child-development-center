import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { StarMark } from "@/components/ui/star-mark";
import { getPayment } from "@/features/billing/queries";
import { ROLE_HOME } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";
import { uuidSchema } from "@/lib/validation/common";

import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Receipt" };

// Admin and the child's parents can open a receipt (RLS decides; anyone else gets 404).
export default async function ReceiptPage({ params }: PageProps<"/receipts/[id]">) {
  const user = await requireRole("admin", "parent");
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const p = await getPayment(id);
  if (!p || p.voided) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <BackLink href={ROLE_HOME[user.role]}>Back</BackLink>
        <PrintButton />
      </div>
      <article className="rounded-xl border border-line bg-white p-6 sm:p-8 print:border-0">
        <header className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <StarMark className="h-10 w-10" />
            <div>
              <p className="text-lg font-bold">Nakshatra Child Development Center</p>
              <p className="text-sm text-ink-400">Payment receipt</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="font-bold whitespace-nowrap">{p.receipt_number}</p>
            <p className="text-sm text-ink-400">{formatDate(p.payment_date)}</p>
          </div>
        </header>
        <dl className="mt-6 grid gap-3 text-[15px] sm:grid-cols-2">
          <div><dt className="text-xs font-bold text-ink-400">Received for</dt><dd>{p.student?.full_name} ({p.student?.admission_number})</dd></div>
          <div><dt className="text-xs font-bold text-ink-400">Towards</dt><dd>{p.fee?.title} ({p.fee?.fee_number})</dd></div>
          <div><dt className="text-xs font-bold text-ink-400">Method</dt><dd>{PAYMENT_METHOD_LABEL[p.method]}{p.reference ? `, ref ${p.reference}` : ""}</dd></div>
          <div><dt className="text-xs font-bold text-ink-400">Balance after all payments</dt><dd>{formatMoney(p.fee?.balance)}</dd></div>
        </dl>
        <p className="mt-8 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-ink-500">Amount received</span>
          <span className="text-3xl font-bold tabular-nums">{formatMoney(p.amount)}</span>
        </p>
        {p.remarks ? <p className="mt-4 text-sm text-ink-500">{p.remarks}</p> : null}
        <p className="mt-10 text-xs text-ink-400">Computer-generated receipt. No signature required.</p>
      </article>
    </main>
  );
}
