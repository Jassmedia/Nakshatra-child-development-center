"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { progressSchema } from "./schemas";

export async function saveProgress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "staff");
  const parsed = parseForm(progressSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("progress_updates").update(fields).eq("id", id).select("id")
    : await supabase.from("progress_updates").insert(fields).select("id");
  if (error) return failure(dbErrorMessage(error));
  if (!data?.length) return failure("You can no longer change this child's progress.");
  revalidatePath("/", "layout");
  return success(id ? "Progress update saved." : "Progress update added.");
}
