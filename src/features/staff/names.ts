import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** id -> staff/admin display name. Names only (safe for parents); one call per request. */
export const getStaffNames = cache(async (): Promise<Map<string, string>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_staff_names");
  return new Map((data ?? []).map((r) => [r.id, r.full_name]));
});

export async function getStudentTherapists(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_student_therapists", { p_student_id: studentId });
  return data ?? [];
}
