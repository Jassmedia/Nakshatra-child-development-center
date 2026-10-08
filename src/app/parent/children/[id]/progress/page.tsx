import type { Metadata } from "next";

import { param } from "@/components/ui/filters";
import { StudentProgressView } from "@/features/progress/components/student-progress-view";

export const metadata: Metadata = { title: "Progress" };

export default async function Page({ params, searchParams }: PageProps<"/parent/children/[id]/progress">) {
  const { id } = await params;
  const area = param((await searchParams).area) || undefined;
  return <StudentProgressView studentId={id} canEdit={false} area={area} basePath={`/parent/children/${id}/progress`} />;
}
