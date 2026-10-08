import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/layout";
import { StudentForm } from "@/features/students/components/student-form";
import { getStudent } from "@/features/students/queries";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage({ params }: PageProps<"/admin/students/[id]/edit">) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();
  return (
    <Panel title="Edit details" className="max-w-3xl">
      <StudentForm student={student} />
    </Panel>
  );
}
