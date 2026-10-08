import { EmptyState, Panel } from "@/components/ui/layout";
import type { CurrentUser } from "@/lib/auth/session";

import { listStudentAssignments } from "../queries";
import { AssignmentCard } from "./assignment-card";
import { AssignmentForm } from "./assignment-form";

const GROUPS = [
  { status: "pending", title: "To do at home" },
  { status: "completed", title: "Done, waiting for review" },
  { status: "reviewed", title: "Reviewed" },
] as const;

export async function StudentAssignmentsView({ studentId, viewer }: { studentId: string; viewer: CurrentUser }) {
  const items = await listStudentAssignments(studentId);
  const canManage = viewer.role !== "parent";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-6">
        {items.length === 0 ? (
          <EmptyState title="No home assignments yet">
            {canManage ? "Create one with the form. Parents see it straight away." : "When the therapist sets a home task, it will appear here."}
          </EmptyState>
        ) : (
          GROUPS.map((g) => {
            const list = items.filter((a) => a.status === g.status);
            if (list.length === 0) return null;
            return (
              <section key={g.status} aria-label={g.title}>
                <h2 className="mb-2 text-base font-bold text-ink-600">{g.title} ({list.length})</h2>
                <div className="flex flex-col gap-3">
                  {list.map((a) => <AssignmentCard key={a.id} assignment={a} viewer={viewer} />)}
                </div>
              </section>
            );
          })
        )}
      </div>
      {canManage ? (
        <div>
          <Panel title="New home assignment" className="lg:sticky lg:top-4">
            <AssignmentForm studentId={studentId} />
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
