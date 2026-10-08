import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState, Panel } from "@/components/ui/layout";
import { getStudentTherapists } from "@/features/staff/names";
import { StudentDetails } from "@/features/students/components/student-details";
import { getStudent } from "@/features/students/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Child" };

export default async function ChildOverview({ params }: PageProps<"/parent/children/[id]">) {
  const { id } = await params;
  const [student, therapists] = await Promise.all([getStudent(id), getStudentTherapists(id)]);
  if (!student) notFound();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <StudentDetails student={student} />
      <Panel title="Therapists">
        {therapists.length === 0 ? (
          <EmptyState title="No therapist assigned yet" />
        ) : (
          <ul className="flex flex-col gap-3">
            {therapists.map((t) => (
              <li key={t.staff_id}>
                <p className="font-bold">{t.full_name}</p>
                <p className="text-sm text-ink-400">
                  {[t.designation, t.assignment_role].filter(Boolean).join(", ")}
                  {t.starts_on ? ` since ${formatDate(t.starts_on)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-ink-400">To change any details, please contact the center.</p>
      </Panel>
    </div>
  );
}
