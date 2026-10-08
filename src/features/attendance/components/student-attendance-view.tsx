import Link from "next/link";

import { EmptyState, Panel, Stat, StatusBadge, Table, Td, Th } from "@/components/ui/layout";
import { ATTENDANCE_LABEL } from "@/lib/constants";
import { formatDate, todayIST } from "@/lib/utils";

import { studentAttendance, summarize } from "../queries";
import { AttendanceRegister } from "./attendance-register";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthParam(v: string | string[] | undefined) {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v) ? v : todayIST().slice(0, 7);
}

export async function StudentAttendanceView({
  student,
  canEdit,
  month,
  basePath,
}: {
  student: { id: string; full_name: string; admission_number: string; status: string };
  canEdit: boolean;
  month: string;
  basePath: string;
}) {
  const { from, to } = monthRange(month);
  const rows = await studentAttendance(student.id, from, to);
  const s = summarize(rows);
  const today = todayIST();
  const todayRow = rows.find((r) => r.attendance_date === today);
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-6">
      {canEdit && student.status === "active" && month === today.slice(0, 7) ? (
        <section aria-label="Mark today">
          <h2 className="mb-2 text-base font-bold">Today, {formatDate(today)}</h2>
          <AttendanceRegister date={today} students={[student]} existing={todayRow ? { [student.id]: todayRow } : {}} />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`${basePath}?month=${shiftMonth(month, -1)}`} className="font-bold text-ink-600 hover:underline">‹ Previous</Link>
        <h2 className="text-lg font-bold">{label}</h2>
        <Link href={`${basePath}?month=${shiftMonth(month, 1)}`} className="font-bold text-ink-600 hover:underline">Next ›</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Attendance rate" value={s.rate === null ? "—" : `${s.rate}%`} hint="Present or late, leave excluded" />
        <Stat label="Present" value={s.present} tone="good" />
        <Stat label="Late" value={s.late} tone="warn" />
        <Stat label="Absent" value={s.absent} tone={s.absent ? "bad" : undefined} hint={s.leave ? `${s.leave} on leave` : undefined} />
      </div>
      <Panel padded={false}>
        {rows.length === 0 ? (
          <div className="p-4"><EmptyState title="No attendance recorded this month" /></div>
        ) : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Status</Th><Th>In</Th><Th>Out</Th><Th>Remarks</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>{formatDate(r.attendance_date)}</Td>
                  <Td><StatusBadge status={r.status} label={ATTENDANCE_LABEL[r.status]} /></Td>
                  <Td>{r.check_in?.slice(0, 5) ?? "—"}</Td>
                  <Td>{r.check_out?.slice(0, 5) ?? "—"}</Td>
                  <Td>{r.remarks ?? ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
