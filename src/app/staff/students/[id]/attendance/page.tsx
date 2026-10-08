import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { monthParam, StudentAttendanceView } from "@/features/attendance/components/student-attendance-view";
import { getStudent } from "@/features/students/queries";

export const metadata: Metadata = { title: "Attendance" };

export default async function Page({ params, searchParams }: PageProps<"/staff/students/[id]/attendance">) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();
  const month = monthParam((await searchParams).month);
  return <StudentAttendanceView student={student} canEdit month={month} basePath={`/staff/students/${id}/attendance`} />;
}
