import { EmptyState, Stat } from "@/components/ui/layout";

import { attendanceForDate, registerStudents, summarize } from "../queries";
import { AttendanceRegister } from "./attendance-register";

/** Register for one date over every active child the user may see (RLS: staff get their own students). */
export async function RegisterView({ date }: { date: string }) {
  const [students, existing] = await Promise.all([registerStudents(), attendanceForDate(date)]);
  if (students.length === 0) return <EmptyState title="No active students to mark" />;
  const s = summarize([...existing.values()]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Marked" value={`${s.marked} / ${students.length}`} />
        <Stat label="Present" value={s.present + s.late} tone="good" hint={s.late ? `${s.late} late` : undefined} />
        <Stat label="Absent" value={s.absent} tone={s.absent ? "bad" : undefined} />
        <Stat label="On leave" value={s.leave} />
      </div>
      <AttendanceRegister date={date} students={students} existing={Object.fromEntries(existing)} />
    </div>
  );
}
