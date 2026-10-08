import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { Tabs } from "@/components/ui/tabs";
import { StudentHeader } from "@/features/students/components/student-header";
import { getStudent } from "@/features/students/queries";
import { studentTabs } from "@/features/students/tabs";
import { uuidSchema } from "@/lib/validation/common";

// RLS returns the student only while this therapist is actively assigned; otherwise 404.
export default async function StaffStudentLayout({ children, params }: LayoutProps<"/staff/students/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const student = await getStudent(id);
  if (!student) notFound();
  const base = `/staff/students/${id}`;
  return (
    <>
      <BackLink href="/staff/students">My students</BackLink>
      <div className="mt-2"><StudentHeader student={student} /></div>
      <Tabs items={studentTabs(base, "staff")} />
      {children}
    </>
  );
}
