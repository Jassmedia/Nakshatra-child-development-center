"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/utils";

import { catalogueSchema, newStudentActivitySchema, updateStudentActivitySchema } from "./schemas";

function refresh() {
  // Activity data shows up on several screens (student tabs, today lists, dashboards).
  revalidatePath("/", "layout");
}

export async function saveCatalogueItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(catalogueSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("activities").update(fields).eq("id", id)
    : await supabase.from("activities").insert({ ...fields, is_active: true });
  if (error) {
    return error.code === "23505" ? failure("An activity with this name already exists.", { name: ["Already in the list"] }) : failure(dbErrorMessage(error));
  }
  revalidatePath("/admin/activities/catalogue");
  return success(id ? "Activity updated." : "Activity added to the list.");
}

/** Schedules an activity for a child, optionally repeated over the next days. */
export async function addStudentActivities(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "staff");
  const parsed = parseForm(newStudentActivitySchema, formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.data;
  const supabase = await createClient();

  let title = v.title;
  let kind = v.kind;
  let category = v.category;
  let duration = v.duration_min;
  if (v.activity_id) {
    const { data: item } = await supabase.from("activities").select("name, kind, category, default_duration_min").eq("id", v.activity_id).single();
    if (!item) return failure("That activity is not in the list any more.");
    title = v.title ?? item.name;
    kind = item.kind as typeof kind;
    category = v.category ?? item.category;
    duration = v.duration_min ?? item.default_duration_min;
  }

  const dates: string[] = [];
  for (let offset = 0; dates.length < v.repeat_days && offset < 120; offset++) {
    const d = addDays(v.scheduled_date, offset);
    if (v.skip_sundays && new Date(`${d}T00:00:00Z`).getUTCDay() === 0) continue;
    dates.push(d);
  }

  const rows = dates.map((scheduled_date) => ({
    student_id: v.student_id,
    activity_id: v.activity_id,
    title: title!,
    kind,
    category,
    scheduled_date,
    scheduled_time: v.scheduled_time,
    duration_min: duration,
    goal: v.goal,
  }));
  // RLS rejects the insert unless the user is admin or actively assigned to this child.
  const { error } = await supabase.from("student_activities").insert(rows);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success(rows.length === 1 ? `“${title}” scheduled.` : `“${title}” scheduled on ${rows.length} days.`);
}

export async function updateStudentActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "staff");
  const parsed = parseForm(updateStudentActivitySchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("student_activities").update(fields).eq("id", id).select("id");
  if (error) return failure(dbErrorMessage(error));
  if (!data?.length) return failure("You can no longer update this activity.");
  refresh();
  return success("Saved.");
}
