import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function unreadCount() {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function listNotifications(limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
