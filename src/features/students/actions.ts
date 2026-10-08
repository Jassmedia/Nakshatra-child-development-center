"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { studentSchema } from "./schemas";

export async function saveStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = parseForm(studentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("students")
      .update({ ...fields, admission_number: fields.admission_number ?? undefined })
      .eq("id", id);
    if (error) {
      return error.code === "23505"
        ? failure("That admission number is already used by another student.", { admission_number: ["Already in use"] })
        : failure(dbErrorMessage(error));
    }
    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/students");
    return success("Student details saved.");
  }

  const { data, error } = await supabase
    .from("students")
    .insert({ ...fields, admission_number: fields.admission_number ?? "", created_by: me.id })
    .select("id")
    .single();
  if (error || !data) {
    return error?.code === "23505"
      ? failure("That admission number is already used by another student.", { admission_number: ["Already in use"] })
      : failure(dbErrorMessage(error));
  }
  revalidatePath("/admin/students");
  redirect(`/admin/students/${data.id}?created=1`);
}
