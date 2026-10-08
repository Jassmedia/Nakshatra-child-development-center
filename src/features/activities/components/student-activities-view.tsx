import { EmptyState, Panel } from "@/components/ui/layout";
import { addDays, formatDate, todayIST } from "@/lib/utils";

import { listCatalogue, listStudentActivities } from "../queries";
import { ActivityCard } from "./activity-card";
import { AddActivityForm } from "./add-activity-form";

/** A child's activities: upcoming, then recent history grouped by day. Shared by admin and staff. */
export async function StudentActivitiesView({ studentId, canEdit, days = 30 }: { studentId: string; canEdit: boolean; days?: number }) {
  const today = todayIST();
  const [items, catalogue] = await Promise.all([
    listStudentActivities(studentId, addDays(today, -days), addDays(today, 60)),
    canEdit ? listCatalogue() : Promise.resolve([]),
  ]);
  const upcoming = items.filter((a) => a.scheduled_date > today).reverse();
  const past = items.filter((a) => a.scheduled_date <= today);
  const byDay = new Map<string, typeof past>();
  for (const a of past) byDay.set(a.scheduled_date, [...(byDay.get(a.scheduled_date) ?? []), a]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-6 lg:order-1">
        {byDay.size === 0 ? (
          <EmptyState title="No activities in the last 30 days">{canEdit ? "Schedule one with the form." : null}</EmptyState>
        ) : (
          [...byDay.entries()].map(([day, list]) => (
            <section key={day} aria-label={formatDate(day)}>
              <h2 className="mb-2 text-sm font-bold text-ink-500">{day === today ? `Today, ${formatDate(day)}` : formatDate(day)}</h2>
              <div className="flex flex-col gap-3">
                {list.map((a) => <ActivityCard key={a.id} activity={a} canEdit={canEdit} />)}
              </div>
            </section>
          ))
        )}
      </div>
      <div className="flex flex-col gap-6 lg:order-2">
        {canEdit ? (
          <Panel title="Schedule an activity or workout">
            <AddActivityForm studentId={studentId} catalogue={catalogue} />
          </Panel>
        ) : null}
        <Panel title="Coming up">
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-400">Nothing scheduled after today.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-[15px]">
              {upcoming.slice(0, 20).map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>{a.title}</span>
                  <span className="shrink-0 text-ink-400">{formatDate(a.scheduled_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
