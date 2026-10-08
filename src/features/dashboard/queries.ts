import "server-only";

import { billingSummary } from "@/features/billing/queries";
import { getStaffNames } from "@/features/staff/names";
import { ACTIVITY_STATUS_LABEL, ATTENDANCE_LABEL } from "@/lib/constants";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatMoney, todayIST } from "@/lib/utils";

export async function adminDashboard() {
  const supabase = await createClient();
  const today = todayIST();
  const weekAhead = addDays(today, 7);
  const since = addDays(today, -13);

  const [students, todayActs, upcoming, attendanceToday, tasks, money, attendance14] = await Promise.all([
    fetchAll((a, b) => supabase.from("students").select("id, full_name, status").order("id").range(a, b)),
    supabase.from("student_activities").select("id, title, status, scheduled_time, student:students(id, full_name)").eq("scheduled_date", today).neq("status", "cancelled").order("scheduled_time", { nullsFirst: false }),
    supabase.from("student_activities").select("id, title, scheduled_date, scheduled_time, student:students(full_name)").gt("scheduled_date", today).lte("scheduled_date", weekAhead).eq("status", "scheduled").order("scheduled_date").order("scheduled_time", { nullsFirst: false }).limit(10),
    supabase.from("attendance").select("status").eq("attendance_date", today),
    fetchAll((a, b) => supabase.from("home_assignments").select("id, status, due_date").neq("status", "reviewed").order("id").range(a, b)),
    billingSummary(),
    fetchAll((a, b) => supabase.from("attendance").select("id, attendance_date, status").gte("attendance_date", since).lte("attendance_date", today).order("id").range(a, b)),
  ]);

  const acts = todayActs.data ?? [];
  const att = attendanceToday.data ?? [];
  const active = students.filter((s) => s.status === "active");

  // Attendance rate per day for the last 14 days (days with no marks are skipped).
  const days = Array.from({ length: 14 }, (_, i) => addDays(since, i));
  const trend = days
    .map((d) => {
      const rows = attendance14.filter((r) => r.attendance_date === d && r.status !== "leave");
      const attended = rows.filter((r) => r.status === "present" || r.status === "late").length;
      return { date: d, rate: rows.length ? Math.round((attended / rows.length) * 100) : null, marked: rows.length };
    });

  return {
    students: { active: active.length, onHold: students.filter((s) => s.status === "on_hold").length },
    today: {
      planned: acts.length,
      done: acts.filter((a) => a.status === "completed" || a.status === "partially_completed").length,
      notDone: acts.filter((a) => a.status === "not_completed").length,
      toRecord: acts.filter((a) => a.status === "scheduled"),
    },
    attendance: {
      marked: att.length,
      present: att.filter((a) => a.status === "present" || a.status === "late").length,
      absent: att.filter((a) => a.status === "absent").length,
      unmarked: Math.max(active.length - att.length, 0),
      trend,
    },
    tasks: {
      pending: tasks.filter((t) => t.status === "pending").length,
      waitingReview: tasks.filter((t) => t.status === "completed").length,
      overdue: tasks.filter((t) => t.status === "pending" && t.due_date !== null && t.due_date < today).length,
    },
    upcoming: upcoming.data ?? [],
    money,
  };
}

type AuditRow = { id: number; table_name: string; action: string; changed_by: string | null; changed_at: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null };

/** "Recent updates": the audit log in plain words. Admin only (audit_log RLS). */
export async function recentUpdates(limit = 12) {
  const supabase = await createClient();
  // Scan the log newest-first, page by page, until enough distinct updates are found
  // (a bulk action can produce hundreds of identical rows; at most 5 pages are read).
  const tables = ["students", "student_activities", "attendance", "progress_updates", "home_assignments", "home_assignment_comments", "payments", "fees", "student_staff_assignments"];
  const page = (from: number) =>
    supabase
      .from("audit_log")
      .select("id, table_name, action, changed_by, changed_at, old_data, new_data")
      .in("table_name", tables)
      .neq("action", "DELETE")
      .order("id", { ascending: false })
      .range(from, from + 399);
  const [names, studentRows] = await Promise.all([
    getStaffNames(),
    fetchAll((a, b) => supabase.from("students").select("id, full_name").order("id").range(a, b)),
  ]);
  const student = new Map(studentRows.map((s) => [s.id, s.full_name]));
  const who = (id: string | null) => (id ? (names.get(id) ?? "A parent") : "System");

  const items: Array<{ id: number; at: string; text: string; studentId?: string; kind: string; count: number }> = [];
  for (let p = 0, done = false; p < 5 && !done; p++) {
  const { data } = await page(p * 400);
  if (!data?.length) break;
  for (const r of data as AuditRow[]) {
    const n = r.new_data ?? {};
    const o = r.old_data ?? {};
    const sid = (n.student_id ?? n.id) as string | undefined;
    const child = student.get((n.student_id as string) ?? "") ?? "";
    let text: string | null = null;
    let kind = "update";
    switch (r.table_name) {
      case "students":
        if (r.action === "INSERT") text = `${who(r.changed_by)} added a new student, ${n.full_name}`;
        else if (r.action !== "UPDATE") text = null;
        else if (o.status !== n.status) text = `${n.full_name} is now ${String(n.status).replace("_", " ")}`;
        kind = "student";
        break;
      case "student_activities":
        if (r.action === "INSERT") text = `${who(r.changed_by)} scheduled ${n.title} for ${child}`;
        else if (r.action === "UPDATE" && o.status !== n.status && n.status !== "scheduled")
          text = `${who(r.changed_by)} recorded ${n.title} as ${ACTIVITY_STATUS_LABEL[n.status as string]?.toLowerCase()} for ${child}`;
        kind = "activity";
        break;
      case "attendance":
        if (r.action === "INSERT" || o.status !== n.status)
          text = `${who(r.changed_by)} marked ${child} ${ATTENDANCE_LABEL[n.status as string]?.toLowerCase()}`;
        kind = "attendance";
        break;
      case "progress_updates":
        if (r.action === "INSERT") text = `${who(r.changed_by)} added a ${n.area} progress update for ${child}`;
        kind = "progress";
        break;
      case "home_assignments":
        if (r.action === "INSERT") text = `${who(r.changed_by)} set a home task for ${child}: ${n.title}`;
        else if (n.status === "completed" && o.status !== "completed") text = `Parent of ${child} completed: ${n.title}`;
        else if (n.status === "reviewed" && o.status !== "reviewed") text = `${who(r.changed_by)} reviewed ${child}'s task: ${n.title}`;
        kind = "task";
        break;
      case "home_assignment_comments":
        text = `${who(r.changed_by)} commented on a home task for ${child}`;
        kind = "task";
        break;
      case "payments":
        if (r.action === "INSERT") text = `Payment of ${formatMoney(n.amount as number)} recorded for ${child}`;
        else if (n.voided && !o.voided) text = `Payment ${n.receipt_number} for ${child} was voided`;
        kind = "payment";
        break;
      case "fees":
        if (r.action === "INSERT") text = `Fee created for ${child}: ${n.title}`;
        kind = "payment";
        break;
      case "student_staff_assignments":
        if (r.action === "INSERT") text = `${names.get(n.staff_id as string) ?? "A therapist"} was assigned to ${child}`;
        else if (n.ends_on && !o.ends_on) text = `${names.get(n.staff_id as string) ?? "A therapist"}'s assignment with ${child} ended`;
        kind = "student";
        break;
    }
    if (!text) continue;
    // Bulk actions (e.g. an activity repeated over 30 days) become one line: "… (×30)".
    const last = items.at(-1);
    if (last && last.text === text) {
      last.count += 1;
      continue;
    }
    if (items.length >= limit) {
      done = true;
      break;
    }
    items.push({ id: r.id, at: r.changed_at, text, studentId: sid, kind, count: 1 });
  }
  }
  return items;
}
