import type { Metadata } from "next";

import { StudentAssignmentsView } from "@/features/home-assignments/components/student-assignments-view";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Home tasks" };

export default async function Page({ params }: PageProps<"/parent/children/[id]/home-tasks">) {
  const viewer = await requireRole("parent");
  const { id } = await params;
  return <StudentAssignmentsView studentId={id} viewer={viewer} />;
}
