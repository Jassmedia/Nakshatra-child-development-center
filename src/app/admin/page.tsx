import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, Panel, Stat } from "@/components/ui/layout";
import { AttendanceTrend } from "@/features/dashboard/attendance-trend";
import { adminDashboard, recentUpdates } from "@/features/dashboard/queries";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatMoney, todayIST } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const DOT: Record<string, string> = {
  activity: "bg-ink-500",
  attendance: "bg-sage-600",
  progress: "bg-star-500",
  task: "bg-amber-700",
  payment: "bg-rose-600",
  student: "bg-ink-300",
};

export default async function AdminDashboard() {
  const user = await requireRole("admin");
  const [d, feed] = await Promise.all([adminDashboard(), recentUpdates()]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-[28px]">Good to see you, {user.fullName.split(" ")[0] || "Admin"}</h1>
        <p className="mt-1 text-[15px] text-ink-400">{formatDate(todayIST())} at the center</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/admin/students" className="rounded-xl focus-visible:outline-2">
          <Stat label="Students" value={d.students.active} hint={d.students.onHold ? `${d.students.onHold} on hold` : "active"} />
        </Link>
        <Link href="/admin/activities" className="rounded-xl">
          <Stat label="Today's activities" value={`${d.today.done} / ${d.today.planned}`} hint={d.today.toRecord.length ? `${d.today.toRecord.length} still to record` : "all recorded"} tone={d.today.toRecord.length ? "warn" : "good"} />
        </Link>
        <Link href="/admin/attendance" className="rounded-xl">
          <Stat label="Present today" value={d.attendance.present} hint={d.attendance.unmarked ? `${d.attendance.unmarked} not marked, ${d.attendance.absent} absent` : `${d.attendance.absent} absent`} tone={d.attendance.unmarked ? "warn" : undefined} />
        </Link>
        <Link href="/admin/billing" className="rounded-xl">
          <Stat label="Pending payments" value={formatMoney(d.money.outstanding)} hint={d.money.overdueCount ? `${formatMoney(d.money.overdueAmount)} overdue` : "nothing overdue"} tone={d.money.overdueCount ? "bad" : undefined} />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Tasks for today" actions={<Link href="/admin/activities" className="text-sm font-bold text-ink-600 hover:underline">All activities</Link>}>
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
              <span><strong className="tabular-nums">{d.today.done}</strong> completed</span>
              <span><strong className="tabular-nums">{d.today.toRecord.length}</strong> pending</span>
              {d.today.notDone ? <span><strong className="tabular-nums">{d.today.notDone}</strong> not done</span> : null}
            </div>
            {d.today.toRecord.length === 0 ? (
              <p className="text-sm text-ink-400">{d.today.planned ? "Every activity planned for today has been recorded." : "No activities planned for today."}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {d.today.toRecord.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 py-2 text-[15px]">
                    <span><span className="font-bold">{a.student?.full_name}</span>, {a.title}</span>
                    <span className="shrink-0 text-ink-400">{a.scheduled_time?.slice(0, 5) ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Attendance, last 14 days">
            <AttendanceTrend points={d.attendance.trend} />
          </Panel>

          <Panel title="Upcoming activities (next 7 days)">
            {d.upcoming.length === 0 ? (
              <p className="text-sm text-ink-400">Nothing scheduled in the next week.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {d.upcoming.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 py-2 text-[15px]">
                    <span><span className="font-bold">{a.student?.full_name}</span>, {a.title}</span>
                    <span className="shrink-0 text-ink-400">{formatDate(a.scheduled_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Parent assignments" actions={<Link href="/admin/home-tasks" className="text-sm font-bold text-ink-600 hover:underline">Open</Link>}>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div><dt className="text-xs text-ink-400">With parents</dt><dd className="text-2xl font-bold tabular-nums">{d.tasks.pending}</dd></div>
              <div><dt className="text-xs text-ink-400">To review</dt><dd className="text-2xl font-bold text-amber-700 tabular-nums">{d.tasks.waitingReview}</dd></div>
              <div><dt className="text-xs text-ink-400">Overdue</dt><dd className={`text-2xl font-bold tabular-nums ${d.tasks.overdue ? "text-rose-800" : ""}`}>{d.tasks.overdue}</dd></div>
            </dl>
          </Panel>

          <Panel title="Recent updates">
            {feed.length === 0 ? (
              <EmptyState title="Nothing yet" />
            ) : (
              <ol className="flex flex-col gap-3">
                {feed.map((f) => (
                  <li key={f.id} className="flex gap-3">
                    <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT[f.kind] ?? "bg-ink-300"}`} />
                    <span className="min-w-0">
                      <span className="block text-[15px] leading-snug">{f.text}{f.count > 1 ? <span className="text-ink-400"> (×{f.count})</span> : null}</span>
                      <span className="text-xs text-ink-400">{formatDateTime(f.at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
