import { RatingStars } from "@/components/ui/choice";
import { Badge, StatusBadge } from "@/components/ui/layout";
import { ACTIVITY_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

import { ActivityUpdate } from "./activity-update";

type Activity = {
  id: string;
  title: string;
  kind: string;
  category: string | null;
  scheduled_time: string | null;
  duration_min: number | null;
  goal: string | null;
  status: string;
  performance_rating: number | null;
  staff_remarks: string | null;
  completed_at: string | null;
  updated_by_name?: string | null;
  student?: { id: string; full_name: string } | null;
};

export function ActivityCard({ activity: a, canEdit, showStudent }: { activity: Activity; canEdit: boolean; showStudent?: boolean }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {showStudent && a.student ? <p className="text-sm font-bold text-ink-400">{a.student.full_name}</p> : null}
          <h3 className="text-[17px] font-bold text-ink-800">{a.title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-400">
            {a.scheduled_time ? <span>{a.scheduled_time.slice(0, 5)}</span> : null}
            {a.duration_min ? <span>{a.duration_min} min</span> : null}
            {a.kind === "workout" ? <Badge tone="info">Workout</Badge> : null}
            {a.category ? <span>{a.category}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RatingStars value={a.performance_rating} />
          <StatusBadge status={a.status} label={ACTIVITY_STATUS_LABEL[a.status]} />
        </div>
      </div>
      {a.goal ? <p className="mt-2 text-[15px] text-ink-600"><span className="font-bold">Goal: </span>{a.goal}</p> : null}
      {a.staff_remarks ? (
        <blockquote className="mt-2 border-l-2 border-star-500 pl-3 text-[15px] leading-6 whitespace-pre-line text-ink-700">
          {a.staff_remarks}
          {a.updated_by_name ? (
            <footer className="mt-1 text-xs text-ink-400">
              {a.updated_by_name}
              {a.completed_at ? `, ${formatDateTime(a.completed_at)}` : ""}
            </footer>
          ) : null}
        </blockquote>
      ) : null}
      {canEdit ? <ActivityUpdate activity={a} /> : null}
    </article>
  );
}
