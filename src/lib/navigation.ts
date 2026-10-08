import type { AppRole } from "@/lib/auth/roles";

export type NavItem = { href: string; label: string };

/** Menu per role. Pages still check permissions themselves; this only decides what is shown. */
export const NAV: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "User accounts" },
  ],
  staff: [{ href: "/staff", label: "Today" }],
  parent: [{ href: "/parent", label: "Home" }],
};
