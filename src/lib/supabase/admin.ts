import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * PRIVILEGED Supabase client using the SECRET key. It BYPASSES Row Level Security.
 *
 * Use ONLY in server code, ONLY after the caller has been verified as an Admin
 * (e.g. requireRole("admin")), and ONLY for things RLS cannot do — such as
 * creating/inviting Auth users with app_metadata.role.
 * For normal reads/writes use ./server.ts so the database enforces permissions.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SECRET_KEY } = getServerEnv();

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
