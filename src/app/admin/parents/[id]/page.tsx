import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui/layout";
import { ParentForm } from "@/features/parents/components/parent-form";
import { ParentLoginPanel } from "@/features/parents/components/parent-login-panel";
import { getParent } from "@/features/parents/queries";
import { STATUS_LABEL } from "@/lib/constants";
import { humanize } from "@/lib/utils";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Parent" };

export default async function ParentPage({ params }: PageProps<"/admin/parents/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const parent = await getParent(id);
  if (!parent) notFound();

  return (
    <>
      <PageHeader title={parent.full_name} back={<BackLink href="/admin/parents">Parents</BackLink>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Contact details"><ParentForm parent={parent} /></Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Children">
            {parent.student_parents.length === 0 ? (
              <EmptyState title="Not linked to a child">Open a student&apos;s page and use “Link an existing parent”.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {parent.student_parents.map((sp) =>
                  sp.student ? (
                    <li key={sp.id} className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/students/${sp.student.id}`} className="font-bold text-ink-600 hover:underline">{sp.student.full_name}</Link>
                      <span className="text-sm text-ink-400">{humanize(sp.relationship)}</span>
                      <StatusBadge status={sp.student.status} label={STATUS_LABEL[sp.student.status]} />
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </Panel>
          <Panel title="Parent portal login">
            <ParentLoginPanel parentId={parent.id} email={parent.email} login={parent.login} />
          </Panel>
        </div>
      </div>
    </>
  );
}
