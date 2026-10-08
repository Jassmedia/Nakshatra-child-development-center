import type { AppRole } from "@/lib/auth/roles";

/** Sections of a student's record. Each stage adds its section here. */
export function studentTabs(base: string, role: AppRole) {
  void role;
  return [
    { href: base, label: "Profile" },
    { href: `${base}/activities`, label: "Activities" },
    { href: `${base}/attendance`, label: "Attendance" },
    { href: `${base}/progress`, label: "Progress" },
  ];
}
