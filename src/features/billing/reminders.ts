"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { checkbox } from "@/lib/validation/common";

const settingsSchema = z.object({
  reminders_enabled: checkbox,
  reminder_days_before: z.coerce.number().int().min(1, "At least 1 day").max(30, "At most 30 days"),
  overdue_repeat_days: z.coerce.number().int().min(1, "At least 1 day").max(60, "At most 60 days"),
});

export async function saveReminderSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = parseForm(settingsSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ ...parsed.data, updated_by: me.id }).eq("id", 1);
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/billing/reminders");
  return success("Reminder settings saved.");
}

export async function runRemindersNow(): Promise<ActionState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_payment_reminders", {});
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/", "layout");
  return success(data ? `${data} reminder${data === 1 ? "" : "s"} sent.` : "No reminders were due today. Nothing was sent twice.");
}
