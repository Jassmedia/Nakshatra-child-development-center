import { Details, Panel } from "@/components/ui/layout";
import { formatDate, humanize } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function StudentDetails({ student: s }: { student: Tables<"students"> }) {
  return (
    <Panel title="Profile">
      <Details
        items={[
          ["Date of birth", formatDate(s.date_of_birth)],
          ["Gender", humanize(s.gender)],
          ["Blood group", s.blood_group],
          ["School", s.school_name],
          ["Enrolled", formatDate(s.enrollment_date)],
          ...(s.discharged_on ? ([["Discharged", formatDate(s.discharged_on)]] as Array<[string, string]>) : []),
          ["Address", s.address],
        ]}
      />
      <div className="mt-5 grid gap-4 border-t border-line pt-4">
        <Note label="Diagnosis / condition" text={s.diagnosis} />
        <Note label="Medical notes" text={s.medical_notes} highlight />
        <Note label="Other notes" text={s.notes} />
      </div>
    </Panel>
  );
}

function Note({ label, text, highlight }: { label: string; text: string | null; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold text-ink-400">{label}</p>
      {text ? (
        <p className={`mt-1 whitespace-pre-line text-[15px] leading-6 ${highlight ? "rounded-lg bg-amber-50 px-3 py-2 text-ink-800" : ""}`}>{text}</p>
      ) : (
        <p className="mt-1 text-[15px] text-ink-300">None recorded</p>
      )}
    </div>
  );
}
