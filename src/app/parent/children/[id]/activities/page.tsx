import type { Metadata } from "next";

import { StudentActivitiesView } from "@/features/activities/components/student-activities-view";

export const metadata: Metadata = { title: "Activities" };

export default async function Page({ params }: PageProps<"/parent/children/[id]/activities">) {
  const { id } = await params;
  return <StudentActivitiesView studentId={id} canEdit={false} />;
}
