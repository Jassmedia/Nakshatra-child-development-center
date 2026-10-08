import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AttendanceRow = {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  remarks: string | null;
};

/** Students to show in the register: active children the user may see (RLS). */
export async function registerStudents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, admission_number")
    .eq("status", "active")
    .order("full_name");
  return data ?? [];
}

export async function attendanceForDate(date: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, student_id, attendance_date, status, check_in, check_out, remarks")
    .eq("attendance_date", date);
  return new Map((data ?? []).map((row) => [row.student_id, row as AttendanceRow]));
}

export async function studentAttendance(studentId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, student_id, attendance_date, status, check_in, check_out, remarks")
    .eq("student_id", studentId)
    .gte("attendance_date", from)
    .lte("attendance_date", to)
    .order("attendance_date", { ascending: false });
  return (data ?? []) as AttendanceRow[];
}

/** Present + late count as attended. */
export function summarize(rows: Array<{ status: string }>) {
  const counts = { present: 0, late: 0, absent: 0, leave: 0 };
  for (const r of rows) if (r.status in counts) counts[r.status as keyof typeof counts] += 1;
  const marked = rows.length;
  const attended = counts.present + counts.late;
  const rate = marked - counts.leave > 0 ? Math.round((attended / (marked - counts.leave)) * 100) : null;
  return { ...counts, marked, attended, rate };
}
