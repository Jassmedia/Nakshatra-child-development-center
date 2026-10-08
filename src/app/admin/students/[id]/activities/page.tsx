import type { Metadata } from "next";

import { StudentActivitiesView } from "@/features/activities/components/student-activities-view";

export const metadata: Metadata = { title: "Activities" };

// Access is checked by the layout (requireRole) and by RLS on every query and write.
export default async function Page({ params }: PageProps<"/admin/students/[id]/activities">) {
  const { id } = await params;
  return <StudentActivitiesView studentId={id} canEdit />;
}
