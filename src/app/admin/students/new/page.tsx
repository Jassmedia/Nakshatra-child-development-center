import type { Metadata } from "next";

import { BackLink } from "@/components/ui/back-link";
import { PageHeader, Panel } from "@/components/ui/layout";
import { StudentForm } from "@/features/students/components/student-form";

export const metadata: Metadata = { title: "Add student" };

export default function NewStudentPage() {
  return (
    <>
      <PageHeader title="Add a student" back={<BackLink href="/admin/students">Students</BackLink>} description="Parents and therapists are added on the student's page after saving." />
      <Panel className="max-w-3xl">
        <StudentForm />
      </Panel>
    </>
  );
}
