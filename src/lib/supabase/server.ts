import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Acts AS THE LOGGED-IN USER (reads the session cookie), so RLS applies.
 *
 * Create a new client per request — never share one across requests.
 *
 * Cache Components rule: code that calls this reads cookies, so it must render
 * inside <Suspense> and must NEVER be wrapped in a plain 'use cache' function
 * (that would share one user's data with other users).
 */
export async function createClient() {
  // Read the request cookies FIRST: this marks the page as per-request (never prerendered
  // at build time), so builds work without env vars and no user data is ever baked in.
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. That is fine: the proxy
            // (src/proxy.ts) refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}
