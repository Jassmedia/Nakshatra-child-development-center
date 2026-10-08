import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge, EmptyState, Panel } from "@/components/ui/layout";
import { StudentDetails } from "@/features/students/components/student-details";
import { getStudent, getStudentParents } from "@/features/students/queries";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Student" };

export default async function StaffStudentPage({ params }: PageProps<"/staff/students/[id]">) {
  const { id } = await params;
  const [student, parents] = await Promise.all([getStudent(id), getStudentParents(id)]);
  if (!student) notFound();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <StudentDetails student={student} />
      <Panel title="Parents">
        {parents.length === 0 ? (
          <EmptyState title="No parent on record" />
        ) : (
          <ul className="flex flex-col gap-3">
            {parents.map((l) => (
              <li key={l.id}>
                <p className="flex flex-wrap items-center gap-2 font-bold">
                  {l.parent?.full_name}
                  <span className="text-sm font-normal text-ink-400">{humanize(l.relationship)}</span>
                  {l.is_primary_contact ? <Badge tone="info">Primary</Badge> : null}
                </p>
                <p className="text-sm text-ink-500">
                  {l.parent?.phone ? <a className="underline" href={`tel:${l.parent.phone.replace(/\s/g, "")}`}>{l.parent.phone}</a> : null}
                  {l.parent?.phone && l.parent?.email ? ", " : null}
                  {l.parent?.email}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
