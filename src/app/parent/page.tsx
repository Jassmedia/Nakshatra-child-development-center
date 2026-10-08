import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Home" };

export default async function ParentHome() {
  const user = await requireRole("parent");
  return <PageHeader title={`Hello, ${user.fullName.split(" ")[0] || "there"}`} description="Your child's day at the center." />;
}
