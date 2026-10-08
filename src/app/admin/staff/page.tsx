import type { Metadata } from "next";
import Link from "next/link";

import { LinkButton } from "@/components/ui/button";
import { FilterBar, FilterField, FilterInput, FilterSelect, param } from "@/components/ui/filters";
import { Badge, EmptyState, PageHeader, Panel, Table, Td, Th } from "@/components/ui/layout";
import { listStaff } from "@/features/staff/queries";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage({ searchParams }: PageProps<"/admin/staff">) {
  const sp = await searchParams;
  const q = param(sp.q);
  const status = param(sp.status) || (sp.status === undefined ? "active" : "");
  const staff = await listStaff({ q, status });
  return (
    <>
      <PageHeader title="Staff and therapists" description="Therapists see only the students assigned to them." actions={<LinkButton href="/admin/users/new">Add staff member</LinkButton>} />
      <FilterBar resetHref="/admin/staff?status=">
        <FilterField label="Search" grow><FilterInput name="q" defaultValue={q} placeholder="Name or email" /></FilterField>
        <FilterField label="Status">
          <FilterSelect name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </FilterSelect>
        </FilterField>
      </FilterBar>
      <Panel padded={false}>
        {staff.length === 0 ? (
          <div className="p-4"><EmptyState title="No staff found">Create a staff account under User accounts.</EmptyState></div>
        ) : (
          <Table>
            <thead><tr><Th>Name</Th><Th>Designation</Th><Th>Phone</Th><Th>Current students</Th><Th>Status</Th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50/50">
                  <Td><Link href={`/admin/staff/${s.id}`} className="font-bold text-ink-600 hover:underline">{s.full_name || s.email}</Link></Td>
                  <Td>{s.staff_details?.designation ?? "—"}</Td>
                  <Td>{s.phone ?? "—"}</Td>
                  <Td className="tabular-nums">{s.activeStudents}</Td>
                  <Td>{s.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
