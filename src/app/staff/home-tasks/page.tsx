import type { Metadata } from "next";
import Link from "next/link";

import { param } from "@/components/ui/filters";
import { PageHeader } from "@/components/ui/layout";
import { AssignmentsOverview } from "@/features/home-assignments/components/assignments-overview";
import { requireRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home tasks" };

const VIEWS = [
  ["", "Waiting for review"],
  ["overdue", "Overdue"],
  ["pending", "Pending"],
  ["reviewed", "Reviewed"],
] as const;

export default async function Page({ searchParams }: PageProps<"/staff/home-tasks">) {
  const viewer = await requireRole("staff");
  const view = param((await searchParams).view);
  return (
    <>
      <PageHeader title="Home tasks" description="Assignments parents do at home. Create new ones from a student's Home tasks tab." />
      <nav aria-label="Filter" className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={v ? `/staff/home-tasks?view=${v}` : "/staff/home-tasks"} aria-current={view === v ? "page" : undefined}
            className={cn("rounded-full border px-3.5 py-2 text-sm font-bold", view === v ? "border-ink-600 bg-ink-600 text-white" : "border-line bg-white text-ink-600 hover:bg-ink-50")}>
            {label}
          </Link>
        ))}
      </nav>
      <AssignmentsOverview viewer={viewer} status={view || undefined} />
    </>
  );
}
