"use client";

import { ChoiceGroup } from "@/components/ui/choice";
import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/form";

import { updateStudentActivity } from "../actions";

export function ActivityUpdate({
  activity,
}: {
  activity: { id: string; status: string; performance_rating: number | null; staff_remarks: string | null };
}) {
  return (
    <details className="group mt-3 rounded-lg border border-line">
      <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-bold text-ink-600">
        {activity.status === "scheduled" ? "Record outcome" : "Edit outcome"}
      </summary>
      <ActionForm action={updateStudentActivity} className="border-t border-line p-3">
        <input type="hidden" name="id" value={activity.id} />
        <div>
          <p className="mb-1.5 text-sm font-bold text-ink-700">Status</p>
          <ChoiceGroup
            name="status"
            legend="Status"
            size="sm"
            defaultValue={activity.status === "scheduled" ? "completed" : activity.status}
            options={[
              { value: "completed", label: "Completed", tone: "good" },
              { value: "partially_completed", label: "Partly done", tone: "warn" },
              { value: "not_completed", label: "Not done", tone: "bad" },
              { value: "scheduled", label: "Scheduled" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-bold text-ink-700">How did it go? (1 = needed a lot of help, 5 = independent)</p>
          <ChoiceGroup
            name="performance_rating"
            legend="Rating"
            size="sm"
            defaultValue={activity.performance_rating ? String(activity.performance_rating) : ""}
            options={[
              { value: "", label: "No rating" },
              ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
            ]}
          />
        </div>
        <Field label="Remarks for the record (parents can read these)" name="staff_remarks">
          <Textarea name="staff_remarks" rows={3} defaultValue={activity.staff_remarks ?? ""} />
        </Field>
        <div>
          <SubmitButton size="sm">Save outcome</SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}
