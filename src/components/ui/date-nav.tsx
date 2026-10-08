import Link from "next/link";

import { addDays, formatDate, todayIST } from "@/lib/utils";

import { buttonClass } from "./button";

/** Previous / next day links plus a date picker. Keeps other query params. */
export function DateNav({ date, basePath, params = {} }: { date: string; basePath: string; params?: Record<string, string> }) {
  const href = (d: string) => `${basePath}?${new URLSearchParams({ ...params, date: d }).toString()}`;
  const today = todayIST();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link href={href(addDays(date, -1))} className={buttonClass("secondary", "md")} aria-label="Previous day">‹</Link>
      <form method="get" action={basePath} className="flex items-center gap-2">
        {Object.entries(params).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input type="date" name="date" defaultValue={date} aria-label="Date" className="h-11 rounded-lg border border-line bg-white px-3" />
        <button type="submit" className={buttonClass("secondary", "md")}>Go</button>
      </form>
      <Link href={href(addDays(date, 1))} className={buttonClass("secondary", "md")} aria-label="Next day">›</Link>
      {date !== today ? <Link href={href(today)} className={buttonClass("ghost", "md")}>Today</Link> : null}
      <span className="ml-1 text-[15px] font-bold text-ink-700">{formatDate(date)}{date === today ? " (today)" : ""}</span>
    </div>
  );
}

/** Reads ?date=YYYY-MM-DD, falling back to today. */
export function dateParam(value: string | string[] | undefined): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIST();
}
