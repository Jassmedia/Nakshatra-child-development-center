import "server-only";

import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/utils";

/** Rounds to paise so sums of many amounts never show float noise. */
export const rupees = (n: number) => Math.round(n * 100) / 100;

export function isFeeOverdue(f: { status: string; due_date: string }, today = todayIST()) {
  return (f.status === "pending" || f.status === "partially_paid") && f.due_date < today;
}

/** Display status: adds "overdue" on top of the stored status. */
export function feeDisplayStatus(f: { status: string; due_date: string }) {
  return isFeeOverdue(f) ? "overdue" : f.status;
}

const FEE_COLUMNS =
  "id, fee_number, student_id, title, period_start, period_end, amount, discount, amount_paid, balance, due_date, status, remarks, cancelled_reason, created_at";

export async function listFees(filters: { status?: string; studentId?: string; q?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("fees")
    .select(`${FEE_COLUMNS}, student:students(id, full_name, admission_number)`)
    .order("due_date", { ascending: false })
    .limit(500);
  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.status === "overdue") query = query.in("status", ["pending", "partially_paid"]).lt("due_date", todayIST());
  else if (filters.status === "unpaid") query = query.in("status", ["pending", "partially_paid"]);
  else if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) {
    const q = filters.q.replace(/[%_,()]/g, " ").trim();
    if (q) query = query.or(`title.ilike.%${q}%,fee_number.ilike.%${q}%`);
  }
  const { data } = await query;
  return data ?? [];
}

export async function getFee(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fees")
    .select(`${FEE_COLUMNS}, student:students(id, full_name, admission_number), payments(id, receipt_number, amount, payment_date, method, reference, remarks, voided, void_reason, created_at)`)
    .eq("id", id)
    .maybeSingle();
  if (data) data.payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at));
  return data;
}

export async function studentFees(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fees")
    .select(`${FEE_COLUMNS}, payments(id, receipt_number, amount, payment_date, method, reference, voided)`)
    .eq("student_id", studentId)
    .order("due_date", { ascending: false });
  return data ?? [];
}

export async function getPayment(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*, fee:fees(fee_number, title, amount, discount, amount_paid, balance, period_start, period_end), student:students(full_name, admission_number)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function billingSummary() {
  const supabase = await createClient();
  const today = todayIST();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [open, paidThisMonth] = await Promise.all([
    supabase.from("fees").select("balance, due_date, status").in("status", ["pending", "partially_paid"]),
    supabase.from("payments").select("amount").eq("voided", false).gte("payment_date", monthStart).lte("payment_date", today),
  ]);
  const rows = open.data ?? [];
  const overdue = rows.filter((f) => f.due_date < today);
  return {
    outstanding: rupees(rows.reduce((s, f) => s + Number(f.balance), 0)),
    openCount: rows.length,
    overdueAmount: rupees(overdue.reduce((s, f) => s + Number(f.balance), 0)),
    overdueCount: overdue.length,
    collectedThisMonth: rupees((paidThisMonth.data ?? []).reduce((s, p) => s + Number(p.amount), 0)),
  };
}
