"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { assignmentSchema, commentSchema, completeSchema, reviewSchema } from "./schemas";

const refresh = () => revalidatePath("/", "layout");

export async function saveAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "staff");
  const parsed = parseForm(assignmentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("home_assignments").update(fields).eq("id", id).select("id")
    : await supabase.from("home_assignments").insert(fields).select("id");
  if (error) return failure(dbErrorMessage(error));
  if (!data?.length) return failure("You can no longer change this child's assignments.");
  refresh();
  return success(id ? "Assignment updated." : `“${fields.title}” assigned. The parents can see it now.`);
}

export async function reviewAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "staff");
  const parsed = parseForm(reviewSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("home_assignments")
    .update({ status: parsed.data.decision, staff_feedback: parsed.data.staff_feedback })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return failure(dbErrorMessage(error));
  if (!data?.length) return failure("You can no longer review this assignment.");
  refresh();
  return success(parsed.data.decision === "reviewed" ? "Marked as reviewed." : "Sent back to the parents as pending.");
}

/** Parent marks a task as done (the database function checks it's their child). */
export async function completeAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("parent");
  const parsed = parseForm(completeSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_home_assignment", {
    p_assignment_id: parsed.data.id,
    p_comment: parsed.data.comment ?? undefined,
  });
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Marked as done. The therapist will review it.");
}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "staff", "parent");
  const parsed = parseForm(commentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  // student_id is filled in by the database from the assignment.
  const { error } = await supabase
    .from("home_assignment_comments")
    .insert({ assignment_id: parsed.data.assignment_id, body: parsed.data.body, student_id: "00000000-0000-0000-0000-000000000000" });
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Comment added.");
}
