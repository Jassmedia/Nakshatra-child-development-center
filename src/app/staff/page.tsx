import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/ui/layout";
import { DailyActivitiesView } from "@/features/activities/components/daily-activities-view";
import { RegisterView } from "@/features/attendance/components/register-view";
import { myStudents } from "@/features/staff/queries";
import { requireRole } from "@/lib/auth/session";
import { formatDate, todayIST } from "@/lib/utils";

export const metadata: Metadata = { title: "Today" };

export default async function StaffToday() {
  const user = await requireRole("staff");
  const today = todayIST();
  const students = await myStudents();
  return (
    <>
      <PageHeader
        title={`Hello, ${user.fullName.split(" ")[0] || "there"}`}
        description={`${formatDate(today)}. Mark attendance, then record how each session went.`}
      />
      {students.length === 0 ? (
        <EmptyState title="No students are assigned to you yet">The administrator assigns students to therapists.</EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="att">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="att" className="text-lg font-bold">Attendance</h2>
              <Link href="/staff/attendance" className="text-sm font-bold text-ink-600 hover:underline">Another day</Link>
            </div>
            <RegisterView date={today} />
          </section>
          <section aria-labelledby="act">
            <h2 id="act" className="mb-3 text-lg font-bold">Today&apos;s activities</h2>
            <DailyActivitiesView date={today} canEdit />
          </section>
        </div>
      )}
    </>
  );
}
