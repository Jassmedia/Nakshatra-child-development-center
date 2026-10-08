import { EmptyState, Stat } from "@/components/ui/layout";
import type { CurrentUser } from "@/lib/auth/session";
import { todayIST } from "@/lib/utils";

import { isOverdue, listAssignments } from "../queries";
import { AssignmentCard } from "./assignment-card";

/** Work queue: completed tasks waiting for review, then overdue ones. */
export async function AssignmentsOverview({ viewer, status }: { viewer: CurrentUser; status?: string }) {
  const today = todayIST();
  const all = await listAssignments();
  const waiting = all.filter((a) => a.status === "completed");
  const overdue = all.filter((a) => isOverdue(a, today));
  const pending = all.filter((a) => a.status === "pending");
  const shown = status === "pending" ? pending : status === "reviewed" ? all.filter((a) => a.status === "reviewed") : status === "overdue" ? overdue : waiting;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Waiting for review" value={waiting.length} tone={waiting.length ? "warn" : undefined} />
        <Stat label="Pending with parents" value={pending.length} />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "bad" : undefined} />
        <Stat label="Reviewed" value={all.filter((a) => a.status === "reviewed").length} tone="good" />
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Nothing here">All caught up.</EmptyState>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {shown.map((a) => (
            <AssignmentCard key={a.id} assignment={a} viewer={viewer} showStudent studentName={(a as { student?: { full_name: string } | null }).student?.full_name} />
          ))}
        </div>
      )}
    </div>
  );
}
