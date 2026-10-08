import type { AppRole } from "@/lib/auth/roles";

export type NavItem = { href: string; label: string };

/** Menu per role. Pages still check permissions themselves; this only decides what is shown. */
export const NAV: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/activities", label: "Daily activities" },
    { href: "/admin/attendance", label: "Attendance" },
    { href: "/admin/progress", label: "Progress" },
    { href: "/admin/home-tasks", label: "Home tasks" },
    { href: "/admin/parents", label: "Parents" },
    { href: "/admin/staff", label: "Staff" },
    { href: "/admin/users", label: "User accounts" },
  ],
  staff: [
    { href: "/staff", label: "Today" },
    { href: "/staff/students", label: "My students" },
    { href: "/staff/attendance", label: "Attendance" },
    { href: "/staff/home-tasks", label: "Home tasks" },
  ],
  parent: [{ href: "/parent", label: "Home" }],
};
