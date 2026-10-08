import type { Metadata } from "next";

import { BackLink } from "@/components/ui/back-link";
import { PageHeader, Panel } from "@/components/ui/layout";
import { ParentForm } from "@/features/parents/components/parent-form";

export const metadata: Metadata = { title: "Add parent" };

export default function NewParentPage() {
  return (
    <>
      <PageHeader title="Add a parent" back={<BackLink href="/admin/parents">Parents</BackLink>} description="Tip: you can also add a parent directly from a student's page, which links them in one step." />
      <Panel className="max-w-2xl"><ParentForm /></Panel>
    </>
  );
}
