import { StatusBadge } from "@/components/ui/layout";
import { STATUS_LABEL } from "@/lib/constants";
import { ageFrom } from "@/lib/utils";

export function StudentHeader({
  student,
  actions,
}: {
  student: { full_name: string; admission_number: string; date_of_birth: string | null; status: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-100 text-lg font-bold text-ink-600">
          {student.full_name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-[28px]">{student.full_name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-400">
            <span>{student.admission_number}</span>
            <span aria-hidden>/</span>
            <span>{ageFrom(student.date_of_birth)}</span>
            <StatusBadge status={student.status} label={STATUS_LABEL[student.status]} />
          </p>
        </div>
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
