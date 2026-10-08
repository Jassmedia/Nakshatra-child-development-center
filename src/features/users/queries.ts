import "server-only";

import type { AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function listProfiles(filters: { role?: AppRole; q?: string; status?: "active" | "inactive" }) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, is_active, created_at")
    .order("full_name");
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("is_active", filters.status === "active");
  if (filters.q) {
    const q = filters.q.replace(/[%_,()]/g, " ").trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data, error } = await query.limit(500);
  if (error) throw new Error("Could not load accounts");
  return data;
}

export async function getProfile(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, is_active, created_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}
