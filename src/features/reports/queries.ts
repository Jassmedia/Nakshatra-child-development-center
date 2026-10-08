import "server-only";

import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_STATUS_LABEL, ATTENDANCE_LABEL, FEE_STATUS_LABEL, PAYMENT_METHOD_LABEL, TREND_LABEL } from "@/lib/constants";
import { todayIST } from "@/lib/utils";

import type { ReportKey, ReportResult } from "./definitions";

export type ReportFilters = { from: string; to: string; studentId?: string };

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : null);
const money = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** Every query runs as the logged-in user, so RLS limits the rows (staff: assigned children; no billing). */
export async function runReport(key: ReportKey, f: ReportFilters): Promise<ReportResult> {
  const supabase = await createClient();
  const byStudent = <T extends { student_id: string }>(q: T[]) => q.filter((r) => !f.studentId || r.student_id === f.studentId);
  const students = await fetchAll((a, b) => supabase.from("students").select("id, full_name, admission_number, status").order("full_name").order("id").range(a, b));
  const visible = students.filter((s) => !f.studentId || s.id === f.studentId);
  const nameOf = new Map(students.map((s) => [s.id, s.full_name]));

  switch (key) {
    case "attendance": {
      const data = await fetchAll((a, b) => supabase.from("attendance").select("id, student_id, status").gte("attendance_date", f.from).lte("attendance_date", f.to).order("id").range(a, b));
      const rows = visible.map((s) => {
        const mine = byStudent(data).filter((r) => r.student_id === s.id);
        const c = (st: string) => mine.filter((r) => r.status === st).length;
        const counted = mine.length - c("leave");
        return { student: s.full_name, present: c("present"), late: c("late"), absent: c("absent"), leave: c("leave"), marked: mine.length, rate: pct(c("present") + c("late"), counted) };
      }).filter((r) => r.marked > 0 || f.studentId);
      const sum = (k: "present" | "late" | "absent" | "leave" | "marked") => rows.reduce((t, r) => t + r[k], 0);
      return {
        columns: [
          { key: "student", label: "Student" },
          { key: "present", label: ATTENDANCE_LABEL.present, align: "right" },
          { key: "late", label: ATTENDANCE_LABEL.late, align: "right" },
          { key: "absent", label: ATTENDANCE_LABEL.absent, align: "right" },
          { key: "leave", label: ATTENDANCE_LABEL.leave, align: "right" },
          { key: "marked", label: "Days marked", align: "right" },
          { key: "rate", label: "Attendance %", align: "right" },
        ],
        rows,
        totals: { student: "All", present: sum("present"), late: sum("late"), absent: sum("absent"), leave: sum("leave"), marked: sum("marked"), rate: pct(sum("present") + sum("late"), sum("marked") - sum("leave")) },
        note: "Attendance % = (present + late) / days marked, not counting leave.",
      };
    }
    case "activities": {
      const data = await fetchAll((a, b) => supabase.from("student_activities").select("id, student_id, status").gte("scheduled_date", f.from).lte("scheduled_date", f.to).order("id").range(a, b));
      const rows = visible.map((s) => {
        const mine = byStudent(data).filter((r) => r.student_id === s.id && r.status !== "cancelled");
        const c = (st: string) => mine.filter((r) => r.status === st).length;
        return { student: s.full_name, planned: mine.length, completed: c("completed"), partial: c("partially_completed"), not_done: c("not_completed"), open: c("scheduled"), rate: pct(c("completed") + c("partially_completed"), mine.length - c("scheduled")) };
      }).filter((r) => r.planned > 0 || f.studentId);
      const sum = (k: "planned" | "completed" | "partial" | "not_done" | "open") => rows.reduce((t, r) => t + r[k], 0);
      return {
        columns: [
          { key: "student", label: "Student" },
          { key: "planned", label: "Planned", align: "right" },
          { key: "completed", label: ACTIVITY_STATUS_LABEL.completed, align: "right" },
          { key: "partial", label: ACTIVITY_STATUS_LABEL.partially_completed, align: "right" },
          { key: "not_done", label: ACTIVITY_STATUS_LABEL.not_completed, align: "right" },
          { key: "open", label: "Not recorded yet", align: "right" },
          { key: "rate", label: "Completion %", align: "right" },
        ],
        rows,
        totals: { student: "All", planned: sum("planned"), completed: sum("completed"), partial: sum("partial"), not_done: sum("not_done"), open: sum("open"), rate: pct(sum("completed") + sum("partial"), sum("planned") - sum("open")) },
        note: "Cancelled activities are excluded. Completion % counts completed and partly done among recorded activities.",
      };
    }
    case "parent-tasks": {
      const today = todayIST();
      const data = await fetchAll((a, b) => supabase.from("home_assignments").select("id, student_id, status, due_date").gte("assigned_on", f.from).lte("assigned_on", f.to).order("id").range(a, b));
      const rows = visible.map((s) => {
        const mine = byStudent(data).filter((r) => r.student_id === s.id);
        const done = mine.filter((r) => r.status !== "pending").length;
        return {
          student: s.full_name,
          assigned: mine.length,
          done,
          reviewed: mine.filter((r) => r.status === "reviewed").length,
          pending: mine.filter((r) => r.status === "pending").length,
          overdue: mine.filter((r) => r.status === "pending" && r.due_date && r.due_date < today).length,
          rate: pct(done, mine.length),
        };
      }).filter((r) => r.assigned > 0 || f.studentId);
      const sum = (k: "assigned" | "done" | "reviewed" | "pending" | "overdue") => rows.reduce((t, r) => t + r[k], 0);
      return {
        columns: [
          { key: "student", label: "Student" },
          { key: "assigned", label: "Assigned", align: "right" },
          { key: "done", label: "Done by parents", align: "right" },
          { key: "reviewed", label: "Reviewed", align: "right" },
          { key: "pending", label: "Pending", align: "right" },
          { key: "overdue", label: "Overdue", align: "right" },
          { key: "rate", label: "Completion %", align: "right" },
        ],
        rows,
        totals: { student: "All", assigned: sum("assigned"), done: sum("done"), reviewed: sum("reviewed"), pending: sum("pending"), overdue: sum("overdue"), rate: pct(sum("done"), sum("assigned")) },
        note: "Tasks assigned within the period.",
      };
    }
    case "progress": {
      const data = await fetchAll((a, b) => supabase
        .from("progress_updates")
        .select("id, student_id, record_date, area, level, trend, observations, attention_areas, shared_with_parent")
        .gte("record_date", f.from)
        .lte("record_date", f.to)
        .order("record_date", { ascending: false })
        .order("id")
        .range(a, b));
      return {
        columns: [
          { key: "date", label: "Date" },
          { key: "student", label: "Student" },
          { key: "area", label: "Area" },
          { key: "level", label: "Level", align: "right" },
          { key: "trend", label: "Trend" },
          { key: "observations", label: "Observations" },
          { key: "attention", label: "Needs attention" },
          { key: "shared", label: "Shared with parents" },
        ],
        rows: byStudent(data).map((r) => ({
          date: r.record_date,
          student: nameOf.get(r.student_id) ?? "",
          area: r.area,
          level: r.level,
          trend: TREND_LABEL[r.trend],
          observations: r.observations,
          attention: r.attention_areas,
          shared: r.shared_with_parent ? "Yes" : "No",
        })),
      };
    }
    case "pending-assignments": {
      const today = todayIST();
      const data = await fetchAll((a, b) => supabase
        .from("home_assignments")
        .select("id, student_id, title, assigned_on, due_date")
        .eq("status", "pending")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("id")
        .range(a, b));
      return {
        columns: [
          { key: "student", label: "Student" },
          { key: "title", label: "Task" },
          { key: "assigned", label: "Assigned" },
          { key: "due", label: "Due" },
          { key: "overdue", label: "Days overdue", align: "right" },
        ],
        rows: byStudent(data).map((r) => ({
          student: nameOf.get(r.student_id) ?? "",
          title: r.title,
          assigned: r.assigned_on,
          due: r.due_date,
          overdue: r.due_date && r.due_date < today ? daysBetween(r.due_date, today) : null,
        })),
        note: "All currently pending tasks (the date range does not apply).",
      };
    }
    case "pending-payments": {
      const today = todayIST();
      const data = await fetchAll((a, b) => supabase
        .from("fees")
        .select("id, student_id, fee_number, title, amount, discount, amount_paid, balance, due_date, status")
        .in("status", ["pending", "partially_paid"])
        .order("due_date")
        .order("id")
        .range(a, b));
      const rows = byStudent(data).map((r) => ({
        student: nameOf.get(r.student_id) ?? "",
        fee: `${r.title} (${r.fee_number})`,
        payable: money(Number(r.amount) - Number(r.discount)),
        paid: money(Number(r.amount_paid)),
        pending: money(Number(r.balance)),
        due: r.due_date,
        status: FEE_STATUS_LABEL[r.status],
        overdue: r.due_date < today ? daysBetween(r.due_date, today) : null,
      }));
      return {
        columns: [
          { key: "student", label: "Student" },
          { key: "fee", label: "Fee" },
          { key: "payable", label: "Payable (₹)", align: "right" },
          { key: "paid", label: "Paid (₹)", align: "right" },
          { key: "pending", label: "Pending (₹)", align: "right" },
          { key: "due", label: "Due" },
          { key: "status", label: "Status" },
          { key: "overdue", label: "Days overdue", align: "right" },
        ],
        rows,
        totals: { student: "All", payable: money(rows.reduce((t, r) => t + r.payable, 0)), paid: money(rows.reduce((t, r) => t + r.paid, 0)), pending: money(rows.reduce((t, r) => t + r.pending, 0)) },
        note: "All fees not fully paid (the date range does not apply).",
      };
    }
    case "payment-history": {
      const data = await fetchAll((a, b) => supabase
        .from("payments")
        .select("id, student_id, receipt_number, amount, payment_date, method, reference, remarks, voided, void_reason, fee:fees(title)")
        .gte("payment_date", f.from)
        .lte("payment_date", f.to)
        .order("payment_date", { ascending: false })
        .order("id")
        .range(a, b));
      const rows = byStudent(data).map((r) => ({
        date: r.payment_date,
        receipt: r.receipt_number,
        student: nameOf.get(r.student_id) ?? "",
        fee: r.fee?.title ?? "",
        method: PAYMENT_METHOD_LABEL[r.method],
        reference: r.reference,
        amount: money(Number(r.amount)),
        remarks: r.voided ? `VOIDED: ${r.void_reason}` : r.remarks,
      }));
      const valid = byStudent(data).filter((r) => !r.voided);
      const byMethod = Object.entries(
        valid.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.method]: (acc[r.method] ?? 0) + Number(r.amount) }), {}),
      )
        .map(([m, v]) => `${PAYMENT_METHOD_LABEL[m]} ₹${money(v).toLocaleString("en-IN")}`)
        .join(", ");
      return {
        columns: [
          { key: "date", label: "Date" },
          { key: "receipt", label: "Receipt" },
          { key: "student", label: "Student" },
          { key: "fee", label: "Fee" },
          { key: "method", label: "Method" },
          { key: "reference", label: "Reference" },
          { key: "amount", label: "Amount (₹)", align: "right" },
          { key: "remarks", label: "Remarks" },
        ],
        rows,
        totals: { date: "Total received", amount: money(valid.reduce((t, r) => t + Number(r.amount), 0)) },
        note: byMethod ? `By method: ${byMethod}. Voided payments are listed but not counted.` : undefined,
      };
    }
  }
}

/** RFC 4180 CSV; formula-looking cells are prefixed so spreadsheets don't execute them. */
export function toCsv(result: ReportResult): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v !== "number") s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [result.columns.map((c) => esc(c.label)).join(",")];
  for (const row of result.rows) lines.push(result.columns.map((c) => esc(row[c.key])).join(","));
  if (result.totals) lines.push(result.columns.map((c) => esc(result.totals?.[c.key])).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
