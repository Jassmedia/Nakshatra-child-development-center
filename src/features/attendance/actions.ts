"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, failure, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { attendanceRowSchema, registerDateSchema } from "./schemas";

/**
 * Saves a whole register (one date, many children). Field names are
 * status:<studentId>, in:<studentId>, out:<studentId>, remarks:<studentId>.
 * Children without a chosen status are left untouched.
 */
export async function saveAttendanceRegister(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "staff");
  const date = registerDateSchema.safeParse({ attendance_date: formData.get("attendance_date") });
  if (!date.success) return failure("Choose a valid date.");

  const rows = [];
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("status:") || typeof value !== "string" || value === "") continue;
    const studentId = key.slice("status:".length);
    const parsed = attendanceRowSchema.safeParse({
      student_id: studentId,
      attendance_date: date.data.attendance_date,
      status: value,
      check_in: formData.get(`in:${studentId}`) ?? "",
      check_out: formData.get(`out:${studentId}`) ?? "",
      remarks: formData.get(`remarks:${studentId}`) ?? "",
    });
    if (!parsed.success) {
      fieldErrors[`row:${studentId}`] = [parsed.error.issues[0].message];
      continue;
    }
    rows.push(parsed.data);
  }
  if (Object.keys(fieldErrors).length) return failure("Some rows need fixing.", fieldErrors);
  if (rows.length === 0) return failure("Mark at least one child.");

  const supabase = await createClient();
  // Upsert on (student_id, attendance_date): re-saving corrects the day's entry; the audit log keeps the old value.
  const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,attendance_date" });
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/", "layout");
  return success(`Attendance saved for ${rows.length} ${rows.length === 1 ? "child" : "children"}.`);
}
