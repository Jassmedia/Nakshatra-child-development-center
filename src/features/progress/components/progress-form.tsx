import { ChoiceGroup } from "@/components/ui/choice";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { DEVELOPMENT_AREAS, LEVEL_LABEL } from "@/lib/constants";
import { todayIST } from "@/lib/utils";

import { saveProgress } from "../actions";
import type { ProgressUpdate } from "../queries";

export function ProgressForm({ studentId, update }: { studentId: string; update?: ProgressUpdate }) {
  const u = update;
  return (
    <ActionForm action={saveProgress} resetOnSuccess={!u}>
      {u ? <input type="hidden" name="id" value={u.id} /> : null}
      <input type="hidden" name="student_id" value={studentId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Area" name="area" required>
          <Select name="area" defaultValue={u?.area ?? DEVELOPMENT_AREAS[0]}>
            {DEVELOPMENT_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            {u && !(DEVELOPMENT_AREAS as readonly string[]).includes(u.area) ? <option value={u.area}>{u.area}</option> : null}
          </Select>
        </Field>
        <Field label="Date" name="record_date" required>
          <Input name="record_date" type="date" defaultValue={u?.record_date ?? todayIST()} max={todayIST()} />
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-bold text-ink-700">Current level</p>
        <ChoiceGroup
          name="level"
          legend="Current level"
          size="sm"
          defaultValue={u?.level ? String(u.level) : ""}
          options={[{ value: "", label: "Not rated" }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}` }))]}
        />
        <p className="mt-1 text-xs text-ink-400">1 {LEVEL_LABEL[1]}, 3 {LEVEL_LABEL[3].toLowerCase()}, 5 {LEVEL_LABEL[5].toLowerCase()}</p>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-bold text-ink-700">Since the last update</p>
        <ChoiceGroup
          name="trend"
          legend="Trend"
          size="sm"
          defaultValue={u?.trend ?? "steady"}
          options={[
            { value: "improving", label: "Improving", tone: "good" },
            { value: "steady", label: "Steady" },
            { value: "needs_attention", label: "Needs attention", tone: "bad" },
          ]}
        />
      </div>
      <Field label="Observations" name="observations" required>
        <Textarea name="observations" rows={3} defaultValue={u?.observations ?? ""} placeholder="What you saw in sessions" />
      </Field>
      <Field label="Improvement" name="improvements">
        <Textarea name="improvements" rows={2} defaultValue={u?.improvements ?? ""} placeholder="What got better" />
      </Field>
      <Field label="Areas requiring attention" name="attention_areas">
        <Textarea name="attention_areas" rows={2} defaultValue={u?.attention_areas ?? ""} />
      </Field>
      <Field label="Recommendations for home" name="recommendations">
        <Textarea name="recommendations" rows={2} defaultValue={u?.recommendations ?? ""} />
      </Field>
      <Checkbox name="shared_with_parent" label="Share this update with the parents" defaultChecked={u ? u.shared_with_parent : true} />
      <div><SubmitButton>{u ? "Save changes" : "Add progress update"}</SubmitButton></div>
    </ActionForm>
  );
}
