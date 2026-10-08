"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/utils";

import { assignSchema, endAssignmentSchema, staffDetailsSchema } from "./schemas";

export async function saveStaffDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(staffDetailsSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, full_name, phone, ...details } = parsed.data;

  const supabase = await createClient();
  const profile = await supabase.from("profiles").update({ full_name, phone }).eq("id", id);
  if (profile.error) return failure(dbErrorMessage(profile.error));
  const { error } = await supabase.from("staff_details").upsert({ profile_id: id, ...details });
  if (error) return failure(dbErrorMessage(error));

  revalidatePath(`/admin/staff/${id}`);
  revalidatePath("/admin/staff");
  return success("Staff details saved.");
}

export async function assignStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = parseForm(assignSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { return_to, ...row } = parsed.data;
  void return_to;

  const supabase = await createClient();
  const { error } = await supabase.from("student_staff_assignments").insert({ ...row, assigned_by: me.id });
  if (error) {
    return error.code === "23505"
      ? failure("This therapist already has an open assignment with this student.")
      : failure(dbErrorMessage(error));
  }
  revalidatePath(`/admin/students/${row.student_id}`);
  revalidatePath(`/admin/staff/${row.staff_id}`);
  revalidatePath("/admin/staff");
  return success("Therapist assigned.");
}

export async function endAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(endAssignmentSchema, formData.has("ends_on") ? formData : withToday(formData));
  if (!parsed.ok) return failure("Invalid request.");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("student_staff_assignments")
    .select("student_id, staff_id, starts_on")
    .eq("id", parsed.data.id)
    .single();
  if (!current) return failure("Assignment not found.");

  // ends_on is exclusive: ending today removes access immediately.
  // An assignment that hasn't started yet is closed on its start day (active zero days; history kept).
  const endsOn = parsed.data.ends_on < current.starts_on ? current.starts_on : parsed.data.ends_on;
  const { error } = await supabase.from("student_staff_assignments").update({ ends_on: endsOn }).eq("id", parsed.data.id);
  if (error) return failure(dbErrorMessage(error));

  revalidatePath(`/admin/students/${current.student_id}`);
  revalidatePath(`/admin/staff/${current.staff_id}`);
  revalidatePath("/admin/staff");
  return success("Assignment ended. Access is removed now; the record stays in the history.");
}

function withToday(formData: FormData) {
  const copy = new FormData();
  formData.forEach((v, k) => copy.append(k, v));
  copy.set("ends_on", todayIST());
  return copy;
}
