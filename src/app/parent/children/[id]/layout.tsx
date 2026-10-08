import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { Tabs } from "@/components/ui/tabs";
import { StudentHeader } from "@/features/students/components/student-header";
import { getStudent } from "@/features/students/queries";
import { studentTabs } from "@/features/students/tabs";
import { uuidSchema } from "@/lib/validation/common";

// RLS returns the child only if this parent is linked to them; anything else is a 404.
export default async function ChildLayout({ children, params }: LayoutProps<"/parent/children/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const student = await getStudent(id);
  if (!student) notFound();
  const base = `/parent/children/${id}`;
  return (
    <>
      <BackLink href="/parent">Home</BackLink>
      <div className="mt-2"><StudentHeader student={student} /></div>
      <Tabs items={studentTabs(base, "parent")} />
      {children}
    </>
  );
}
