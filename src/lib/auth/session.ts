import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { hasRole, isAppRole, ROLE_HOME, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/** The minimal, safe-to-pass-around description of the logged-in user. */
export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: AppRole;
};

/**
 * Data Access Layer entry point: who is the current user?
 *
 * 1. getClaims() VERIFIES the session JWT (never trust getSession() on the server).
 * 2. The role is read from public.profiles (admin-controlled), never from JWT metadata.
 * 3. Deactivated users are treated as logged out.
 *
 * Returns null when nobody (valid) is logged in.
 * Wrapped in React cache(): layout + page + actions share ONE lookup per request.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile || !profile.is_active || !isAppRole(profile.role)) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  };
});

/**
 * Server-side guard for pages, Server Actions and Route Handlers.
 * Not logged in -> /login. Wrong role -> that user's own home area.
 * Re-check inside EVERY Server Action: actions are public HTTP endpoints.
 */
export async function requireRole(...allowed: AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user.role, allowed)) redirect(ROLE_HOME[user.role]);
  return user;
}
