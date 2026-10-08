import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listParents(q?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("parents")
    .select("id, full_name, phone, email, profile_id, student_parents(student:students(id, full_name))")
    .order("full_name");
  if (q) {
    const term = q.replace(/[%_,()]/g, " ").trim();
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  const { data, error } = await query.limit(500);
  if (error) throw new Error("Could not load parents");
  return data;
}

export async function getParent(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parents")
    .select("*, login:profiles!parents_profile_id_fkey(id, email, is_active), student_parents(id, relationship, is_primary_contact, student:students(id, full_name, admission_number, status))")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function parentOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("parents").select("id, full_name, phone, email").order("full_name");
  return data ?? [];
}
