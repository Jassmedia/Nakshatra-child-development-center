import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/layout";
import { ChoiceGroup } from "@/components/ui/choice";
import { ASSIGNMENT_STATUS_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, todayIST } from "@/lib/utils";

import { addComment, completeAssignment, reviewAssignment } from "../actions";
import { isOverdue, type HomeAssignment } from "../queries";
import { AssignmentForm } from "./assignment-form";

type Viewer = { id: string; role: "admin" | "staff" | "parent" };

function authorLabel(c: HomeAssignment["comments"][number], viewer: Viewer) {
  if (c.author_id === viewer.id) return "You";
  return c.staff_name ?? "Parent";
}

export function AssignmentCard({
  assignment: a,
  viewer,
  showStudent,
  studentName,
}: {
  assignment: HomeAssignment;
  viewer: Viewer;
  showStudent?: boolean;
  studentName?: string;
}) {
  const today = todayIST();
  const overdue = isOverdue(a, today);
  const canManage = viewer.role !== "parent";
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {showStudent && studentName ? <p className="text-sm font-bold text-ink-400">{studentName}</p> : null}
          <h3 className="text-[17px] font-bold">{a.title}</h3>
          <p className="text-sm text-ink-400">
            Assigned {formatDate(a.assigned_on)}
            {a.created_by_name ? ` by ${a.created_by_name}` : ""}
            {a.due_date ? `, due ${formatDate(a.due_date)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overdue ? <Badge tone="bad">Overdue</Badge> : null}
          <StatusBadge status={a.status} label={ASSIGNMENT_STATUS_LABEL[a.status]} />
        </div>
      </header>

      {a.instructions ? <p className="mt-3 text-[15px] leading-6 whitespace-pre-line">{a.instructions}</p> : null}

      {a.completed_at ? (
        <p className="mt-3 text-sm text-sage-800">Marked as done {formatDateTime(a.completed_at)}</p>
      ) : null}

      {a.staff_feedback ? (
        <div className="mt-3 rounded-lg bg-sage-50 px-3 py-2">
          <p className="text-xs font-bold text-ink-500">Therapist feedback{a.reviewed_by_name ? `, ${a.reviewed_by_name}` : ""}</p>
          <p className="mt-0.5 text-[15px] whitespace-pre-line">{a.staff_feedback}</p>
        </div>
      ) : null}

      {/* Conversation */}
      {a.comments.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-2 border-l-2 border-ink-100 pl-3" aria-label="Comments">
          {a.comments.map((c) => (
            <li key={c.id}>
              <p className="text-xs text-ink-400">
                <span className="font-bold text-ink-600">{authorLabel(c, viewer)}</span>, {formatDateTime(c.created_at)}
              </p>
              <p className="text-[15px] whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {viewer.role === "parent" && a.status === "pending" ? (
          <ActionForm action={completeAssignment} className="rounded-lg border border-sage-600/40 bg-sage-50/50 p-3">
            <input type="hidden" name="id" value={a.id} />
            <Field label="How did it go? (optional)" name="comment">
              <Textarea name="comment" rows={2} placeholder="Tell the therapist what you noticed" />
            </Field>
            <div><SubmitButton>Mark as done</SubmitButton></div>
          </ActionForm>
        ) : null}

        {canManage && a.status !== "pending" ? (
          <details className="rounded-lg border border-line" open={a.status === "completed"}>
            <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-bold text-ink-600">
              {a.status === "completed" ? "Review" : "Change review"}
            </summary>
            <ActionForm action={reviewAssignment} className="border-t border-line p-3">
              <input type="hidden" name="id" value={a.id} />
              <ChoiceGroup
                name="decision"
                legend="Decision"
                size="sm"
                defaultValue="reviewed"
                options={[
                  { value: "reviewed", label: "Mark reviewed", tone: "good" },
                  { value: "pending", label: "Send back to parents", tone: "warn" },
                ]}
              />
              <Field label="Feedback for the parents" name="staff_feedback">
                <Textarea name="staff_feedback" rows={2} defaultValue={a.staff_feedback ?? ""} />
              </Field>
              <div><SubmitButton size="sm">Save review</SubmitButton></div>
            </ActionForm>
          </details>
        ) : null}

        {canManage && a.status === "pending" ? (
          <details className="rounded-lg border border-line">
            <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-bold text-ink-600">Edit task</summary>
            <div className="border-t border-line p-3">
              <AssignmentForm studentId={a.student_id} assignment={a} />
            </div>
          </details>
        ) : null}

        <details className="rounded-lg border border-line">
          <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-bold text-ink-600">Add a comment</summary>
          <ActionForm action={addComment} className="border-t border-line p-3" resetOnSuccess hideSuccessMessage>
            <input type="hidden" name="assignment_id" value={a.id} />
            <Field label="Comment" name="body">
              <Textarea name="body" rows={2} />
            </Field>
            <div><SubmitButton size="sm" variant="secondary">Post comment</SubmitButton></div>
          </ActionForm>
        </details>
      </div>
    </article>
  );
}
