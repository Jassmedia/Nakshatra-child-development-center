import "server-only";

import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/utils";

/** The logged-in parent's children (RLS returns only their own). */
export async function myChildren() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, admission_number, date_of_birth, status")
    .order("full_name");
  return data ?? [];
}

/** What a parent wants to know at a glance about one child today. */
export async function childSnapshot(studentId: string) {
  const supabase = await createClient();
  const today = todayIST();
  const [attendance, activities, progress, upcoming, tasks, fees] = await Promise.all([
    supabase.from("attendance").select("status, check_in").eq("student_id", studentId).eq("attendance_date", today).maybeSingle(),
    supabase.from("student_activities").select("status").eq("student_id", studentId).eq("scheduled_date", today).neq("status", "cancelled"),
    supabase
      .from("progress_updates")
      .select("area, trend, record_date, observations")
      .eq("student_id", studentId)
      .order("record_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("student_activities")
      .select("title, scheduled_date, scheduled_time")
      .eq("student_id", studentId)
      .gt("scheduled_date", today)
      .eq("status", "scheduled")
      .order("scheduled_date")
      .limit(1)
      .maybeSingle(),
    supabase.from("home_assignments").select("due_date").eq("student_id", studentId).eq("status", "pending"),
    supabase.from("fees").select("balance, due_date").eq("student_id", studentId).in("status", ["pending", "partially_paid"]),
  ]);
  const openFees = fees.data ?? [];
  const acts = activities.data ?? [];
  return {
    attendance: attendance.data,
    activitiesToday: acts.length,
    activitiesDone: acts.filter((a) => a.status === "completed" || a.status === "partially_completed").length,
    latestProgress: progress.data,
    nextActivity: upcoming.data,
    tasksPending: tasks.data?.length ?? 0,
    tasksOverdue: (tasks.data ?? []).filter((t) => t.due_date !== null && t.due_date < today).length,
    feesDue: Math.round(openFees.reduce((sum, f) => sum + Number(f.balance), 0) * 100) / 100,
    feesOverdue: openFees.some((f) => f.due_date < today),
    nextFeeDue: openFees.map((f) => f.due_date).sort()[0] ?? null,
  };
}
