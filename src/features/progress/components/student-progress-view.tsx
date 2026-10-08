import Link from "next/link";

import { EmptyState, Panel, StatusBadge } from "@/components/ui/layout";
import { TREND_LABEL } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

import { latestByArea, listStudentProgress } from "../queries";
import { LevelChart } from "./level-chart";
import { ProgressEntry } from "./progress-entry";
import { ProgressForm } from "./progress-form";

/** Progress tab: one card per area (latest level, trend, chart), then the full history. */
export async function StudentProgressView({
  studentId,
  canEdit,
  area,
  basePath,
}: {
  studentId: string;
  canEdit: boolean;
  area?: string;
  basePath: string;
}) {
  const all = await listStudentProgress(studentId);
  const latest = latestByArea(all);
  const history = area ? all.filter((u) => u.area === area) : all;

  return (
    <div className="flex flex-col gap-6">
      {latest.length > 0 ? (
        <section aria-labelledby="areas">
          <h2 id="areas" className="mb-3 text-lg font-bold">By area</h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {latest.map((u) => {
              const points = all.filter((p) => p.area === u.area && p.level).map((p) => ({ date: p.record_date, level: p.level! }));
              const active = area === u.area;
              return (
                <li key={u.area}>
                  <Link
                    href={active ? basePath : `${basePath}?area=${encodeURIComponent(u.area)}`}
                    aria-current={active ? "true" : undefined}
                    className={cn("block rounded-xl border bg-white p-4 hover:border-ink-300", active ? "border-ink-500 ring-1 ring-ink-500" : "border-line")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{u.area}</p>
                        <p className="text-xs text-ink-400">Last update {formatDate(u.record_date)}</p>
                      </div>
                      <StatusBadge status={u.trend} label={TREND_LABEL[u.trend]} />
                    </div>
                    <div className="mt-2">
                      <LevelChart points={points} label={u.area} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="history" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="history" className="text-lg font-bold">{area ? `${area} history` : "All updates"}</h2>
            {area ? <Link href={basePath} className="text-sm font-bold text-ink-600 hover:underline">Show all areas</Link> : null}
          </div>
          {history.length === 0 ? (
            <EmptyState title="No progress updates yet">{canEdit ? "Add the first one with the form." : "The therapists will share updates here."}</EmptyState>
          ) : (
            history.map((u) => <ProgressEntry key={u.id} update={u} canEdit={canEdit} showInternalFlag={canEdit} />)
          )}
        </section>
        {canEdit ? (
          <div>
            <Panel title="New progress update" className="lg:sticky lg:top-4">
              <ProgressForm studentId={studentId} />
            </Panel>
          </div>
        ) : null}
      </div>
    </div>
  );
}
