import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Today" };

export default async function StaffHome() {
  const user = await requireRole("staff");
  return <PageHeader title={`Hello, ${user.fullName.split(" ")[0] || "there"}`} description="Your students and today's work." />;
}
