import type { Metadata } from "next";
import Link from "next/link";

import { LinkButton } from "@/components/ui/button";
import { FilterBar, FilterField, FilterInput, FilterSelect, param } from "@/components/ui/filters";
import { Badge, EmptyState, PageHeader, Panel, Table, Td, Th } from "@/components/ui/layout";
import { listProfiles } from "@/features/users/queries";
import { ROLE_LABEL, isAppRole } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "User accounts" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const role = param(sp.role);
  const status = param(sp.status);
  const q = param(sp.q);
  const users = await listProfiles({
    role: isAppRole(role) ? role : undefined,
    status: status === "active" || status === "inactive" ? status : undefined,
    q,
  });

  return (
    <>
      <PageHeader
        title="User accounts"
        description="Everyone who can sign in: administrators, therapists and parents."
        actions={<LinkButton href="/admin/users/new">Create account</LinkButton>}
      />
      <FilterBar resetHref="/admin/users">
        <FilterField label="Search" grow>
          <FilterInput name="q" defaultValue={q} placeholder="Name or email" />
        </FilterField>
        <FilterField label="Role">
          <FilterSelect name="role" defaultValue={role}>
            <option value="">All roles</option>
            <option value="admin">Administrator</option>
            <option value="staff">Staff / Therapist</option>
            <option value="parent">Parent</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Status">
          <FilterSelect name="status" defaultValue={status}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </FilterSelect>
        </FilterField>
      </FilterBar>

      <Panel padded={false}>
        {users.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No accounts match these filters" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/50">
                  <Td>
                    <Link href={`/admin/users/${u.id}`} className="font-bold text-ink-600 hover:underline">
                      {u.full_name || "(no name)"}
                    </Link>
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>{ROLE_LABEL[u.role]}</Td>
                  <Td>{u.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
