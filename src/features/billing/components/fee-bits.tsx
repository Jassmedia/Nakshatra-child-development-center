import Link from "next/link";

import { StatusBadge, Table, Td, Th } from "@/components/ui/layout";
import { FEE_STATUS_LABEL } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";

import { feeDisplayStatus } from "../queries";

export function FeeStatus({ fee }: { fee: { status: string; due_date: string } }) {
  const s = feeDisplayStatus(fee);
  return <StatusBadge status={s} label={FEE_STATUS_LABEL[s]} />;
}

type FeeRow = {
  id: string;
  fee_number: string;
  title: string;
  amount: number;
  discount: number;
  amount_paid: number;
  balance: number | null;
  due_date: string;
  status: string;
  student?: { id: string; full_name: string } | null;
};

export function FeesTable({ fees, showStudent, hrefFor }: { fees: FeeRow[]; showStudent?: boolean; hrefFor?: (id: string) => string }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Fee</Th>
          {showStudent ? <Th>Student</Th> : null}
          <Th>Due</Th>
          <Th className="text-right">Amount</Th>
          <Th className="text-right">Paid</Th>
          <Th className="text-right">Pending</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {fees.map((f) => (
          <tr key={f.id} className="hover:bg-ink-50/50">
            <Td>
              {hrefFor ? (
                <Link href={hrefFor(f.id)} className="font-bold text-ink-600 hover:underline">{f.title}</Link>
              ) : (
                <span className="font-bold">{f.title}</span>
              )}
              <span className="block text-xs text-ink-400">{f.fee_number}</span>
            </Td>
            {showStudent ? <Td>{f.student?.full_name}</Td> : null}
            <Td>{formatDate(f.due_date)}</Td>
            <Td className="text-right tabular-nums">
              {formatMoney(Number(f.amount) - Number(f.discount))}
              {Number(f.discount) > 0 ? <span className="block text-xs text-ink-400">after {formatMoney(f.discount)} off</span> : null}
            </Td>
            <Td className="text-right tabular-nums">{formatMoney(f.amount_paid)}</Td>
            <Td className="text-right font-bold tabular-nums">{f.status === "cancelled" ? "—" : formatMoney(f.balance)}</Td>
            <Td><FeeStatus fee={f} /></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
