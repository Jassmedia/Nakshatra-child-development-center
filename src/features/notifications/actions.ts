"use server";

import { revalidatePath } from "next/cache";

import { failure, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markAllRead(): Promise<ActionState> {
  await requireRole("admin", "staff", "parent");
  const supabase = await createClient();
  // RLS limits this to the user's own notifications; only read_at is writable.
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) return failure("Could not update notifications.");
  revalidatePath("/", "layout");
  return success("All notifications marked as read.");
}
