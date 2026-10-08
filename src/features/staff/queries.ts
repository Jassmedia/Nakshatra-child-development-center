import "server-only";

import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/utils";

/** True when an assignment is active on the given day (same rule as private.is_assigned_staff). ends_on is exclusive. */
export function isActiveAssignment(a: { starts_on: string; ends_on: string | null }, day = todayIST()) {
  return a.starts_on <= day && (a.ends_on === null || a.ends_on > day);
}

/** Not ended yet: active now or starting in the future. */
export function isOpenAssignment(a: { ends_on: string | null }, day = todayIST()) {
  return a.ends_on === null || a.ends_on > day;
}

export async function listStaff(filters: { q?: string; status?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, is_active, staff_details(designation, specialization)")
    .eq("role", "staff")
    .order("full_name");
  if (filters.status === "active") query = query.eq("is_active", true);
  if (filters.status === "inactive") query = query.eq("is_active", false);
  if (filters.q) {
    const q = filters.q.replace(/[%_,()]/g, " ").trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error("Could not load staff");

  const assignments = await fetchAll((a, b) =>
    supabase.from("student_staff_assignments").select("id, staff_id, starts_on, ends_on").order("id").range(a, b),
  );
  const counts = new Map<string, number>();
  for (const a of assignments) {
    if (isActiveAssignment(a)) counts.set(a.staff_id, (counts.get(a.staff_id) ?? 0) + 1);
  }
  return data.map((s) => ({ ...s, activeStudents: counts.get(s.id) ?? 0 }));
}

export async function getStaff(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, is_active, role, staff_details(designation, specialization, qualification, joined_on)")
    .eq("id", id)
    .eq("role", "staff")
    .maybeSingle();
  return data;
}

export async function getStaffAssignments(staffId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_staff_assignments")
    .select("id, assignment_role, starts_on, ends_on, notes, student:students(id, full_name, admission_number, status)")
    .eq("staff_id", staffId)
    .order("ends_on", { ascending: false, nullsFirst: true })
    .order("starts_on", { ascending: false });
  return data ?? [];
}

export async function staffOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, staff_details(designation)")
    .eq("role", "staff")
    .eq("is_active", true)
    .order("full_name");
  return data ?? [];
}

/** Students the logged-in therapist is assigned to right now (RLS returns only those). */
export async function myStudents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, admission_number, date_of_birth, status, diagnosis")
    .neq("status", "discharged")
    .order("full_name");
  return data ?? [];
}
