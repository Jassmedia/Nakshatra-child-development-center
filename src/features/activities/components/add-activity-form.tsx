import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { todayIST } from "@/lib/utils";
import type { Tables } from "@/types/database";

import { addStudentActivities } from "../actions";

export function AddActivityForm({ studentId, catalogue, date }: { studentId: string; catalogue: Tables<"activities">[]; date?: string }) {
  const activities = catalogue.filter((c) => c.kind === "activity");
  const workouts = catalogue.filter((c) => c.kind === "workout");
  return (
    <ActionForm action={addStudentActivities} resetOnSuccess>
      <input type="hidden" name="student_id" value={studentId} />
      <Field label="From the activity list" name="activity_id">
        <Select name="activity_id" defaultValue="">
          <option value="">None, I&apos;ll type a name</option>
          {activities.length ? (
            <optgroup label="Activities">
              {activities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ) : null}
          {workouts.length ? (
            <optgroup label="Workouts">
              {workouts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ) : null}
        </Select>
      </Field>
      <Field label="Or a custom name" name="title" hint="Also overrides the list name if both are given">
        <Input name="title" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" name="kind" hint="Ignored when picked from the list">
          <Select name="kind" defaultValue="activity">
            <option value="activity">Activity</option>
            <option value="workout">Workout</option>
          </Select>
        </Field>
        <Field label="Area" name="category">
          <Select name="category" defaultValue="">
            <option value="">From the list / none</option>
            {ACTIVITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Date" name="scheduled_date" required>
          <Input name="scheduled_date" type="date" defaultValue={date ?? todayIST()} />
        </Field>
        <Field label="Time" name="scheduled_time">
          <Input name="scheduled_time" type="time" />
        </Field>
        <Field label="Duration (minutes)" name="duration_min">
          <Input name="duration_min" type="number" inputMode="numeric" min={1} max={480} />
        </Field>
        <Field label="Repeat for how many days" name="repeat_days" hint="1 = just this day">
          <Input name="repeat_days" type="number" inputMode="numeric" min={1} max={60} defaultValue={1} />
        </Field>
      </div>
      <Checkbox name="skip_sundays" label="Skip Sundays when repeating" defaultChecked />
      <Field label="Goal for this activity" name="goal">
        <Textarea name="goal" rows={2} placeholder="e.g. Name 8 of 10 everyday objects" />
      </Field>
      <div><SubmitButton>Schedule</SubmitButton></div>
    </ActionForm>
  );
}
