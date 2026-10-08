import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, StatusBadge } from "@/components/ui/layout";
import { childSnapshot, myChildren } from "@/features/parents/portal";
import { requireRole } from "@/lib/auth/session";
import { ATTENDANCE_LABEL, STATUS_LABEL, TREND_LABEL } from "@/lib/constants";
import { ageFrom, formatDate, formatMoney, todayIST } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

async function ChildCard({ child }: { child: Awaited<ReturnType<typeof myChildren>>[number] }) {
  const s = await childSnapshot(child.id);
  const base = `/parent/children/${child.id}`;
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white">
      <header className="flex items-center gap-3 border-b border-line p-4">
        <div aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-star-300/60 text-lg font-bold text-ink-800">
          {child.full_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold">{child.full_name}</h2>
          <p className="text-sm text-ink-400">{ageFrom(child.date_of_birth)}{child.status !== "active" ? `, ${STATUS_LABEL[child.status]}` : ""}</p>
        </div>
      </header>
      <dl className="grid flex-1 gap-4 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold text-ink-400">Today at the center</dt>
          <dd className="mt-1">
            {s.attendance ? (
              <span className="flex items-center gap-2">
                <StatusBadge status={s.attendance.status} label={ATTENDANCE_LABEL[s.attendance.status]} />
                {s.attendance.check_in ? <span className="text-sm text-ink-500">since {s.attendance.check_in.slice(0, 5)}</span> : null}
              </span>
            ) : (
              <span className="text-[15px] text-ink-400">Not marked yet</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-400">Today&apos;s activities</dt>
          <dd className="mt-1 text-[15px]">
            {s.activitiesToday === 0 ? (
              <span className="text-ink-400">None planned</span>
            ) : (
              <Link href={`${base}/activities`} className="font-bold text-ink-600 hover:underline">
                {s.activitiesDone} of {s.activitiesToday} done
              </Link>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold text-ink-400">Fees</dt>
          <dd className="mt-1 text-[15px]">
            {s.feesDue === 0 ? (
              <span className="text-ink-400">Nothing due</span>
            ) : (
              <Link href={`${base}/fees`} className={s.feesOverdue ? "font-bold text-rose-800 hover:underline" : "font-bold text-ink-600 hover:underline"}>
                {formatMoney(s.feesDue)} {s.feesOverdue ? "overdue" : `due by ${formatDate(s.nextFeeDue)}`}
              </Link>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold text-ink-400">Home tasks</dt>
          <dd className="mt-1 text-[15px]">
            {s.tasksPending === 0 ? (
              <span className="text-ink-400">Nothing to do right now</span>
            ) : (
              <Link href={`${base}/home-tasks`} className="font-bold text-ink-600 hover:underline">
                {s.tasksPending} to do{s.tasksOverdue ? `, ${s.tasksOverdue} overdue` : ""}
              </Link>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold text-ink-400">Latest progress note</dt>
          <dd className="mt-1">
            {s.latestProgress ? (
              <Link href={`${base}/progress`} className="block rounded-lg bg-paper p-3 hover:bg-ink-50">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{s.latestProgress.area}</span>
                  <StatusBadge status={s.latestProgress.trend} label={TREND_LABEL[s.latestProgress.trend]} />
                  <span className="text-xs text-ink-400">{formatDate(s.latestProgress.record_date)}</span>
                </span>
                <span className="mt-1 line-clamp-2 block text-[15px] text-ink-600">{s.latestProgress.observations}</span>
              </Link>
            ) : (
              <span className="text-[15px] text-ink-400">No updates shared yet</span>
            )}
          </dd>
        </div>
        {s.nextActivity ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold text-ink-400">Next session</dt>
            <dd className="mt-1 text-[15px]">
              {s.nextActivity.title}, {formatDate(s.nextActivity.scheduled_date)}
              {s.nextActivity.scheduled_time ? ` at ${s.nextActivity.scheduled_time.slice(0, 5)}` : ""}
            </dd>
          </div>
        ) : null}
      </dl>
      <footer className="border-t border-line p-3">
        <Link href={base} className="flex min-h-11 items-center justify-center rounded-lg font-bold text-ink-600 hover:bg-ink-50">
          Open {child.full_name.split(" ")[0]}&apos;s record
        </Link>
      </footer>
    </article>
  );
}

export default async function ParentHome() {
  const user = await requireRole("parent");
  const children = await myChildren();
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-[28px]">Hello, {user.fullName.split(" ")[0] || "there"}</h1>
        <p className="mt-1 text-[15px] text-ink-400">{formatDate(todayIST())}</p>
      </header>
      {children.length === 0 ? (
        <EmptyState title="No child is linked to your account yet">
          Please contact the center. Once they link your child, you will see activities, attendance and progress here.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {children.map((c) => <ChildCard key={c.id} child={c} />)}
        </div>
      )}
    </>
  );
}
