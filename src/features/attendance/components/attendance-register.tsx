"use client";

import { ChoiceGroup } from "@/components/ui/choice";
import { ActionForm, SubmitButton, useFieldError } from "@/components/ui/form";

import { saveAttendanceRegister } from "../actions";

type Row = { id: string; full_name: string; admission_number: string };
type Existing = { status: string; check_in: string | null; check_out: string | null; remarks: string | null };

function RowError({ studentId }: { studentId: string }) {
  const error = useFieldError(`row:${studentId}`);
  return error ? <p className="text-xs font-bold text-rose-800">{error}</p> : null;
}

/** Daily register: tap a status per child, optional times and remarks, save all at once. */
export function AttendanceRegister({ date, students, existing }: { date: string; students: Row[]; existing: Record<string, Existing> }) {
  return (
    <ActionForm action={saveAttendanceRegister}>
      <input type="hidden" name="attendance_date" value={date} />
      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
        {students.map((s) => {
          const e = existing[s.id];
          return (
            <li key={s.id} className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
              <div className="min-w-44 xl:w-56">
                <p className="font-bold">{s.full_name}</p>
                <p className="text-xs text-ink-400">{e ? "Marked" : "Not marked yet"}</p>
              </div>
              <ChoiceGroup
                name={`status:${s.id}`}
                legend={`Attendance for ${s.full_name}`}
                defaultValue={e?.status}
                options={[
                  { value: "present", label: "Present", tone: "good" },
                  { value: "late", label: "Late", tone: "warn" },
                  { value: "absent", label: "Absent", tone: "bad" },
                  { value: "leave", label: "Leave", tone: "neutral" },
                ]}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-ink-500">
                  In
                  <input type="time" name={`in:${s.id}`} defaultValue={e?.check_in?.slice(0, 5) ?? ""} className="h-11 rounded-lg border border-line px-2" />
                </label>
                <label className="flex items-center gap-1.5 text-sm text-ink-500">
                  Out
                  <input type="time" name={`out:${s.id}`} defaultValue={e?.check_out?.slice(0, 5) ?? ""} className="h-11 rounded-lg border border-line px-2" />
                </label>
              </div>
              <input
                name={`remarks:${s.id}`}
                defaultValue={e?.remarks ?? ""}
                placeholder="Remarks (optional)"
                aria-label={`Remarks for ${s.full_name}`}
                className="h-11 min-w-0 flex-1 rounded-lg border border-line px-3"
              />
              <RowError studentId={s.id} />
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-xl">
        <SubmitButton>Save attendance</SubmitButton>
      </div>
    </ActionForm>
  );
}
