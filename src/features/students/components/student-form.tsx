import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { BLOOD_GROUPS, STATUS_LABEL, STUDENT_STATUSES } from "@/lib/constants";
import type { Tables } from "@/types/database";
import { todayIST } from "@/lib/utils";

import { saveStudent } from "../actions";

/** Create / edit form for a student. Admin only (the action re-checks). */
export function StudentForm({ student }: { student?: Tables<"students"> }) {
  const s = student;
  return (
    <ActionForm action={saveStudent}>
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-bold">Child</legend>
        <Field label="Full name" name="full_name" required>
          <Input name="full_name" defaultValue={s?.full_name} autoComplete="off" />
        </Field>
        <Field label="Admission number" name="admission_number" hint={s ? undefined : "Leave empty to generate one, e.g. NCDC-2026-0001"}>
          <Input name="admission_number" defaultValue={s?.admission_number} autoComplete="off" />
        </Field>
        <Field label="Date of birth" name="date_of_birth">
          <Input name="date_of_birth" type="date" defaultValue={s?.date_of_birth ?? ""} max={todayIST()} />
        </Field>
        <Field label="Gender" name="gender">
          <Select name="gender" defaultValue={s?.gender ?? ""}>
            <option value="">Not specified</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Blood group" name="blood_group">
          <Select name="blood_group" defaultValue={s?.blood_group ?? ""}>
            <option value="">Not known</option>
            {BLOOD_GROUPS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
        </Field>
        <Field label="School" name="school_name">
          <Input name="school_name" defaultValue={s?.school_name ?? ""} />
        </Field>
        <Field label="Address" name="address" className="sm:col-span-2">
          <Textarea name="address" rows={2} defaultValue={s?.address ?? ""} />
        </Field>
      </fieldset>

      <fieldset className="mt-2 grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-bold">At the center</legend>
        <Field label="Enrolment date" name="enrollment_date" required>
          <Input name="enrollment_date" type="date" defaultValue={s?.enrollment_date ?? todayIST()} />
        </Field>
        <Field label="Status" name="status">
          <Select name="status" defaultValue={s?.status ?? "active"}>
            {STUDENT_STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_LABEL[st]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Discharge date" name="discharged_on" hint="Only for discharged students. Defaults to today.">
          <Input name="discharged_on" type="date" defaultValue={s?.discharged_on ?? ""} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Diagnosis / condition" name="diagnosis" className="sm:col-span-2">
          <Textarea name="diagnosis" defaultValue={s?.diagnosis ?? ""} />
        </Field>
        <Field label="Medical notes" name="medical_notes" hint="Allergies, medication, seizures, anything staff must know." className="sm:col-span-2">
          <Textarea name="medical_notes" defaultValue={s?.medical_notes ?? ""} />
        </Field>
        <Field label="Other notes" name="notes" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={s?.notes ?? ""} />
        </Field>
      </fieldset>
      <div>
        <SubmitButton>{s ? "Save changes" : "Add student"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
