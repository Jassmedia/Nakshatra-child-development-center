import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/ui/layout";
import { myStudents } from "@/features/staff/queries";
import { requireRole } from "@/lib/auth/session";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "My students" };

export default async function MyStudentsPage() {
  await requireRole("staff");
  const students = await myStudents();
  return (
    <>
      <PageHeader title="My students" description="Children currently assigned to you." />
      {students.length === 0 ? (
        <EmptyState title="No students assigned to you yet">The administrator assigns students to therapists.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <li key={s.id}>
              <Link href={`/staff/students/${s.id}`} className="block h-full rounded-xl border border-line bg-white p-4 hover:border-ink-300">
                <span className="block text-lg font-bold text-ink-800">{s.full_name}</span>
                <span className="block text-sm text-ink-400">{s.admission_number}, {ageFrom(s.date_of_birth)}</span>
                {s.diagnosis ? <span className="mt-2 line-clamp-2 block text-sm text-ink-500">{s.diagnosis}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
