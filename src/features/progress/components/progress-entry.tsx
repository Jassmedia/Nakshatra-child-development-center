import { Badge, StatusBadge } from "@/components/ui/layout";
import { LEVEL_LABEL, TREND_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

import type { ProgressUpdate } from "../queries";
import { ProgressForm } from "./progress-form";

function Block({ label, text, tone }: { label: string; text: string | null; tone?: "good" | "bad" }) {
  if (!text) return null;
  return (
    <div className={tone === "bad" ? "rounded-lg bg-rose-50 px-3 py-2" : tone === "good" ? "rounded-lg bg-sage-50 px-3 py-2" : ""}>
      <p className="text-xs font-bold text-ink-500">{label}</p>
      <p className="mt-0.5 text-[15px] leading-6 whitespace-pre-line">{text}</p>
    </div>
  );
}

export function ProgressEntry({ update: u, canEdit, showInternalFlag }: { update: ProgressUpdate; canEdit: boolean; showInternalFlag: boolean }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[17px] font-bold">{u.area}</h3>
          <p className="text-sm text-ink-400">
            {formatDate(u.record_date)}
            {u.author_name ? `, by ${u.author_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {u.level ? <Badge tone="info">Level {u.level}: {LEVEL_LABEL[u.level]}</Badge> : null}
          <StatusBadge status={u.trend} label={TREND_LABEL[u.trend]} />
          {showInternalFlag && !u.shared_with_parent ? <Badge tone="warn">Not shared with parents</Badge> : null}
        </div>
      </header>
      <div className="mt-3 flex flex-col gap-3">
        <Block label="Observations" text={u.observations} />
        <Block label="Improvement" text={u.improvements} tone="good" />
        <Block label="Areas requiring attention" text={u.attention_areas} tone="bad" />
        <Block label="Recommendations for home" text={u.recommendations} />
      </div>
      {canEdit ? (
        <details className="mt-3 rounded-lg border border-line">
          <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-bold text-ink-600">Edit</summary>
          <div className="border-t border-line p-3">
            <ProgressForm studentId={u.student_id} update={u} />
          </div>
        </details>
      ) : null}
    </article>
  );
}
