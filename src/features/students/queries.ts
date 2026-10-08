import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * All student reads go through the logged-in user's client, so RLS decides:
 * admin sees all, staff see actively assigned students, parents see their own children.
 */
export async function listStudents(filters: { q?: string; status?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("id, admission_number, full_name, date_of_birth, gender, status, enrollment_date")
    .order("full_name");
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) {
    const q = filters.q.replace(/[%_,()]/g, " ").trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,admission_number.ilike.%${q}%`);
  }
  const { data, error } = await query.limit(500);
  if (error) throw new Error("Could not load students");
  return data;
}

export async function getStudent(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getStudentParents(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_parents")
    .select("id, relationship, is_primary_contact, parent:parents(id, full_name, phone, alternate_phone, email, address, profile_id)")
    .eq("student_id", studentId)
    .order("is_primary_contact", { ascending: false });
  return data ?? [];
}

export async function getStudentAssignments(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_staff_assignments")
    .select("id, assignment_role, starts_on, ends_on, notes, staff:profiles!student_staff_assignments_staff_id_fkey(id, full_name)")
    .eq("student_id", studentId)
    .order("ends_on", { ascending: false, nullsFirst: true })
    .order("starts_on", { ascending: false });
  return data ?? [];
}

/** Lightweight list for <select> pickers. */
export async function studentOptions(onlyActive = true) {
  const supabase = await createClient();
  let query = supabase.from("students").select("id, full_name, admission_number").order("full_name");
  if (onlyActive) query = query.neq("status", "discharged");
  const { data } = await query;
  return data ?? [];
}
