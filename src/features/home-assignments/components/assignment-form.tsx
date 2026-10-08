import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { addDays, todayIST } from "@/lib/utils";

import { saveAssignment } from "../actions";
import type { HomeAssignment } from "../queries";

export function AssignmentForm({ studentId, assignment }: { studentId: string; assignment?: HomeAssignment }) {
  const a = assignment;
  return (
    <ActionForm action={saveAssignment} resetOnSuccess={!a}>
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <input type="hidden" name="student_id" value={studentId} />
      <Field label="Task" name="title" required>
        <Input name="title" defaultValue={a?.title} placeholder="e.g. Practise naming 5 fruits" />
      </Field>
      <Field label="Instructions for the parent" name="instructions">
        <Textarea name="instructions" rows={4} defaultValue={a?.instructions ?? ""} placeholder="What to do, how often, and what to look out for" />
      </Field>
      <Field label="Due date" name="due_date">
        <Input name="due_date" type="date" defaultValue={a?.due_date ?? addDays(todayIST(), 7)} min={a?.assigned_on ?? todayIST()} />
      </Field>
      <div><SubmitButton>{a ? "Save changes" : "Assign to parents"}</SubmitButton></div>
    </ActionForm>
  );
}
