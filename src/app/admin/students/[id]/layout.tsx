import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { LinkButton } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { StudentHeader } from "@/features/students/components/student-header";
import { getStudent } from "@/features/students/queries";
import { studentTabs } from "@/features/students/tabs";
import { uuidSchema } from "@/lib/validation/common";

export default async function StudentLayout({ children, params }: LayoutProps<"/admin/students/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const student = await getStudent(id);
  if (!student) notFound();
  const base = `/admin/students/${id}`;

  return (
    <>
      <BackLink href="/admin/students">Students</BackLink>
      <div className="mt-2">
        <StudentHeader student={student} actions={<LinkButton href={`${base}/edit`} variant="secondary" size="sm">Edit details</LinkButton>} />
      </div>
      <Tabs items={studentTabs(base, "admin")} />
      {children}
    </>
  );
}
