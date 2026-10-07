import { Constants, type Database } from "@/types/database";

/** The three roles that can log in, taken from the database enum (single source of truth). */
export const APP_ROLES = Constants.public.Enums.app_role;

export type AppRole = Database["public"]["Enums"]["app_role"];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** Landing area for each role after login (route groups are built in Steps 2+). */
export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  staff: "/staff",
  parent: "/parent",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  staff: "Staff / Therapist",
  parent: "Parent",
};

/**
 * UI-level helper only (e.g. showing/hiding a menu item).
 * It does NOT protect data — the database RLS policies do.
 */
export function hasRole(role: AppRole | null | undefined, allowed: readonly AppRole[]): boolean {
  return role != null && allowed.includes(role);
}
