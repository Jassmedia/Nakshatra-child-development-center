import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listCatalogue(includeInactive = false) {
  const supabase = await createClient();
  let query = supabase.from("activities").select("*").order("kind").order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  return data ?? [];
}

export type StudentActivity = Awaited<ReturnType<typeof listStudentActivities>>[number];

const ACTIVITY_COLUMNS =
  "id, student_id, title, kind, category, scheduled_date, scheduled_time, duration_min, goal, status, performance_rating, staff_remarks, completed_at, updated_by_profile:profiles!student_activities_updated_by_fkey(full_name)";

/** A child's activities between two dates (newest first). RLS limits who can read. */
export async function listStudentActivities(studentId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_activities")
    .select(ACTIVITY_COLUMNS)
    .eq("student_id", studentId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: true, nullsFirst: false });
  return data ?? [];
}

/** All activities on a date the user may see (admin: all; staff: assigned students). */
export async function listActivitiesForDate(date: string, filters: { studentId?: string; status?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("student_activities")
    .select(`${ACTIVITY_COLUMNS}, student:students(id, full_name)`)
    .eq("scheduled_date", date)
    .order("scheduled_time", { ascending: true, nullsFirst: false });
  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.status) query = query.eq("status", filters.status);
  const { data } = await query;
  return data ?? [];
}
