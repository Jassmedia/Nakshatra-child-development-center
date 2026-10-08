import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { monthParam, StudentAttendanceView } from "@/features/attendance/components/student-attendance-view";
import { getStudent } from "@/features/students/queries";

export const metadata: Metadata = { title: "Attendance" };

export default async function Page({ params, searchParams }: PageProps<"/parent/children/[id]/attendance">) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();
  return <StudentAttendanceView student={student} canEdit={false} month={monthParam((await searchParams).month)} basePath={`/parent/children/${id}/attendance`} />;
}
