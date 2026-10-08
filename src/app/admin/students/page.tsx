import type { Metadata } from "next";
import Link from "next/link";

import { LinkButton } from "@/components/ui/button";
import { FilterBar, FilterField, FilterInput, FilterSelect, param } from "@/components/ui/filters";
import { EmptyState, PageHeader, Panel, StatusBadge, Table, Td, Th } from "@/components/ui/layout";
import { listStudents } from "@/features/students/queries";
import { STATUS_LABEL, STUDENT_STATUSES } from "@/lib/constants";
import { ageFrom, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const sp = await searchParams;
  const q = param(sp.q);
  const status = param(sp.status) || (sp.status === undefined ? "active" : "");
  const students = await listStudents({ q, status: (STUDENT_STATUSES as readonly string[]).includes(status) ? status : undefined });

  return (
    <>
      <PageHeader
        title="Students"
        description={`${students.length} ${students.length === 1 ? "child" : "children"} shown`}
        actions={<LinkButton href="/admin/students/new">Add student</LinkButton>}
      />
      <FilterBar resetHref="/admin/students?status=">
        <FilterField label="Search" grow>
          <FilterInput name="q" defaultValue={q} placeholder="Name or admission number" />
        </FilterField>
        <FilterField label="Status">
          <FilterSelect name="status" defaultValue={status}>
            <option value="">All</option>
            {STUDENT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </FilterSelect>
        </FilterField>
      </FilterBar>
      <Panel padded={false}>
        {students.length === 0 ? (
          <div className="p-4">
            <EmptyState title={q ? "No students match your search" : "No students yet"}>
              {q ? "Try part of the name or the admission number." : "Add the first student to get started."}
            </EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Admission no.</Th>
                <Th>Age</Th>
                <Th>Enrolled</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50/50">
                  <Td>
                    <Link href={`/admin/students/${s.id}`} className="font-bold text-ink-600 hover:underline">
                      {s.full_name}
                    </Link>
                  </Td>
                  <Td>{s.admission_number}</Td>
                  <Td>{ageFrom(s.date_of_birth)}</Td>
                  <Td>{formatDate(s.enrollment_date)}</Td>
                  <Td>
                    <StatusBadge status={s.status} label={STATUS_LABEL[s.status]} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
