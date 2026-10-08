import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminHome() {
  const user = await requireRole("admin");
  return <PageHeader title={`Hello, ${user.fullName.split(" ")[0] || "Admin"}`} description="Center overview." />;
}
