import type { Metadata } from "next";

import { StudentFeesView } from "@/features/billing/components/student-fees-view";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Fees" };

export default async function Page({ params }: PageProps<"/admin/students/[id]/fees">) {
  await requireRole("admin");
  const { id } = await params;
  return <StudentFeesView studentId={id} role="admin" />;
}
