import { EmptyState, Stat } from "@/components/ui/layout";

import { listActivitiesForDate } from "../queries";
import { ActivityCard } from "./activity-card";

export async function DailyActivitiesView({ date, status, canEdit }: { date: string; status?: string; canEdit: boolean }) {
  const all = await listActivitiesForDate(date);
  const items = status ? all.filter((a) => a.status === status) : all;
  const done = all.filter((a) => a.status === "completed" || a.status === "partially_completed").length;
  const pending = all.filter((a) => a.status === "scheduled").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Planned" value={all.filter((a) => a.status !== "cancelled").length} />
        <Stat label="Done" value={done} tone="good" />
        <Stat label="Still to record" value={pending} tone={pending ? "warn" : undefined} />
      </div>
      {items.length === 0 ? (
        <EmptyState title="No activities for this day">Schedule activities from a student&apos;s Activities tab.</EmptyState>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((a) => <ActivityCard key={a.id} activity={a} canEdit={canEdit} showStudent />)}
        </div>
      )}
    </div>
  );
}
