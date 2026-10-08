import type { Metadata } from "next";
import Link from "next/link";

import { LinkButton } from "@/components/ui/button";
import { FilterBar, FilterField, FilterInput, param } from "@/components/ui/filters";
import { Badge, EmptyState, PageHeader, Panel, Table, Td, Th } from "@/components/ui/layout";
import { listParents } from "@/features/parents/queries";

export const metadata: Metadata = { title: "Parents" };

export default async function ParentsPage({ searchParams }: PageProps<"/admin/parents">) {
  const q = param((await searchParams).q);
  const parents = await listParents(q);
  return (
    <>
      <PageHeader title="Parents and guardians" description="Contact records. A parent needs a login to use the parent portal." actions={<LinkButton href="/admin/parents/new">Add parent</LinkButton>} />
      <FilterBar resetHref="/admin/parents">
        <FilterField label="Search" grow>
          <FilterInput name="q" defaultValue={q} placeholder="Name, phone or email" />
        </FilterField>
      </FilterBar>
      <Panel padded={false}>
        {parents.length === 0 ? (
          <div className="p-4"><EmptyState title="No parents found" /></div>
        ) : (
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th>Children</Th><Th>Portal</Th></tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/50">
                  <Td><Link href={`/admin/parents/${p.id}`} className="font-bold text-ink-600 hover:underline">{p.full_name}</Link></Td>
                  <Td>{p.phone ?? "—"}</Td>
                  <Td>{p.email ?? "—"}</Td>
                  <Td>{p.student_parents.map((sp) => sp.student?.full_name).filter(Boolean).join(", ") || "—"}</Td>
                  <Td>{p.profile_id ? <Badge tone="good">Has login</Badge> : <Badge>No login</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
