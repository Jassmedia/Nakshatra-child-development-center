import "server-only";

import { getStaffNames } from "@/features/staff/names";
import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, student_id, record_date, area, level, trend, observations, improvements, attention_areas, recommendations, shared_with_parent, created_at, created_by";

async function withAuthor<T extends { created_by: string | null }>(rows: T[]) {
  const names = await getStaffNames();
  return rows.map((r) => ({ ...r, author_name: r.created_by ? (names.get(r.created_by) ?? null) : null }));
}

export type ProgressUpdate = Awaited<ReturnType<typeof listStudentProgress>>[number];

/** A child's full progress history, newest first. Parents get only shared rows (RLS). */
export async function listStudentProgress(studentId: string, area?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("progress_updates")
    .select(COLUMNS)
    .eq("student_id", studentId)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (area) query = query.eq("area", area);
  const { data } = await query;
  return withAuthor(data ?? []);
}

/** Recent updates across all visible children (admin overview). */
export async function listRecentProgress(filters: { trend?: string; area?: string; from?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("progress_updates")
    .select(`${COLUMNS}, student:students(id, full_name)`)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.trend) query = query.eq("trend", filters.trend);
  if (filters.area) query = query.eq("area", filters.area);
  if (filters.from) query = query.gte("record_date", filters.from);
  const { data } = await query;
  return withAuthor(data ?? []);
}

/** Latest update per area (input must be newest-first). */
export function latestByArea<T extends { area: string }>(rows: T[]): T[] {
  const seen = new Map<string, T>();
  for (const r of rows) if (!seen.has(r.area)) seen.set(r.area, r);
  return [...seen.values()];
}
