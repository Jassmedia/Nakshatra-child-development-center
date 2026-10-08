import type { AppRole } from "@/lib/auth/roles";

/** Sections of a student's record. Billing is hidden from staff (they have no access to it). */
export function studentTabs(base: string, role: AppRole) {
  return [
    { href: base, label: "Profile" },
    { href: `${base}/activities`, label: "Activities" },
    { href: `${base}/attendance`, label: "Attendance" },
    { href: `${base}/progress`, label: "Progress" },
    { href: `${base}/home-tasks`, label: "Home tasks" },
    ...(role === "staff" ? [] : [{ href: `${base}/fees`, label: "Fees" }]),
  ];
}
