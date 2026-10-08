import "server-only";

import { getStaffNames } from "@/features/staff/names";
import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, student_id, title, instructions, assigned_on, due_date, status, completed_at, completed_by, staff_feedback, reviewed_at, reviewed_by, created_by, comments:home_assignment_comments(id, body, author_id, created_at)";

type Comment = { id: string; body: string; author_id: string | null; created_at: string };

async function decorate<T extends { created_by: string | null; reviewed_by: string | null; comments: Comment[] }>(rows: T[]) {
  const names = await getStaffNames();
  return rows.map((r): Omit<T, "comments"> & {
    created_by_name: string | null;
    reviewed_by_name: string | null;
    comments: Array<Comment & { staff_name: string | null }>;
  } => ({
    ...r,
    created_by_name: r.created_by ? (names.get(r.created_by) ?? null) : null,
    reviewed_by_name: r.reviewed_by ? (names.get(r.reviewed_by) ?? null) : null,
    comments: [...r.comments]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({ ...c, staff_name: c.author_id ? (names.get(c.author_id) ?? null) : null })),
  }));
}

export type HomeAssignment = Awaited<ReturnType<typeof listStudentAssignments>>[number];

export async function listStudentAssignments(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("home_assignments")
    .select(COLUMNS)
    .eq("student_id", studentId)
    .order("assigned_on", { ascending: false })
    .order("created_at", { ascending: false });
  return decorate(data ?? []);
}

/** Across all visible children (admin: all; staff: assigned). */
export async function listAssignments(filters: { status?: string; overdueOnly?: boolean; today?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("home_assignments")
    .select(`${COLUMNS}, student:students(id, full_name)`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(300);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.overdueOnly && filters.today) query = query.eq("status", "pending").lt("due_date", filters.today);
  const { data } = await query;
  return decorate(data ?? []);
}

export function isOverdue(a: { status: string; due_date: string | null }, today: string) {
  return a.status === "pending" && a.due_date !== null && a.due_date < today;
}
