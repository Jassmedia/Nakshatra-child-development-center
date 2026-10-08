import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { Badge, EmptyState, Panel } from "@/components/ui/layout";
import { createAndLinkParent, linkExistingParent, makePrimaryContact, unlinkParent } from "@/features/parents/actions";
import { parentOptions } from "@/features/parents/queries";
import { endAssignment, assignStaff } from "@/features/staff/actions";
import { isActiveAssignment, isOpenAssignment, staffOptions } from "@/features/staff/queries";
import { StudentDetails } from "@/features/students/components/student-details";
import { getStudent, getStudentAssignments, getStudentParents } from "@/features/students/queries";
import { RELATIONSHIPS } from "@/lib/constants";
import { formatDate, humanize, todayIST } from "@/lib/utils";

export const metadata: Metadata = { title: "Student" };

export default async function AdminStudentPage({ params, searchParams }: PageProps<"/admin/students/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const [student, parents, assignments, allParents, staff] = await Promise.all([
    getStudent(id),
    getStudentParents(id),
    getStudentAssignments(id),
    parentOptions(),
    staffOptions(),
  ]);
  if (!student) notFound();
  const linkedIds = new Set(parents.map((p) => p.parent?.id));
  const current = assignments.filter((a) => isOpenAssignment(a));
  const past = assignments.filter((a) => !current.includes(a));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-6">
        {sp.created ? (
          <p role="status" className="rounded-lg border border-sage-600/40 bg-sage-50 px-3 py-2 text-sm text-sage-800">
            Student added. Next, link a parent and assign a therapist.
          </p>
        ) : null}
        <StudentDetails student={student} />
      </div>

      <div className="flex flex-col gap-6">
        <Panel title="Parents and guardians">
          {parents.length === 0 ? (
            <EmptyState title="No parent linked yet">Link a parent so they can be contacted and see this child in the parent portal.</EmptyState>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {parents.map((link) =>
                link.parent ? (
                  <li key={link.id} className="flex flex-col gap-2 py-3 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/parents/${link.parent.id}`} className="font-bold text-ink-600 hover:underline">
                        {link.parent.full_name}
                      </Link>
                      <span className="text-sm text-ink-400">{humanize(link.relationship)}</span>
                      {link.is_primary_contact ? <Badge tone="info">Primary contact</Badge> : null}
                      {link.parent.profile_id ? <Badge tone="good">Has login</Badge> : <Badge>No login</Badge>}
                    </div>
                    <p className="text-sm text-ink-500">
                      {[link.parent.phone, link.parent.email].filter(Boolean).join(", ")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {!link.is_primary_contact ? (
                        <ActionButton action={makePrimaryContact} fields={{ id: link.id, student_id: id }} label="Make primary" variant="ghost" />
                      ) : null}
                      <ActionButton
                        action={unlinkParent}
                        fields={{ id: link.id, student_id: id }}
                        label="Unlink"
                        variant="ghost"
                        confirm={`Unlink ${link.parent.full_name} from ${student.full_name}? They will no longer see this child.`}
                      />
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
          )}

          <details className="mt-4 rounded-lg border border-line p-3">
            <summary className="cursor-pointer font-bold text-ink-600">Link an existing parent</summary>
            <ActionForm action={linkExistingParent} className="mt-3" resetOnSuccess>
              <input type="hidden" name="student_id" value={id} />
              <Field label="Parent" name="parent_id">
                <Select name="parent_id" defaultValue="">
                  <option value="">Choose…</option>
                  {allParents.filter((p) => !linkedIds.has(p.id)).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.phone ? `(${p.phone})` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <RelationshipFields />
              <div><SubmitButton size="sm">Link parent</SubmitButton></div>
            </ActionForm>
          </details>

          <details className="mt-3 rounded-lg border border-line p-3" open={parents.length === 0}>
            <summary className="cursor-pointer font-bold text-ink-600">Add a new parent</summary>
            <ActionForm action={createAndLinkParent} className="mt-3" resetOnSuccess>
              <input type="hidden" name="student_id" value={id} />
              <Field label="Full name" name="full_name" required><Input name="full_name" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" name="phone"><Input name="phone" type="tel" /></Field>
                <Field label="Email" name="email" hint="Needed for a parent-portal login"><Input name="email" type="email" /></Field>
              </div>
              <Field label="Alternate phone" name="alternate_phone"><Input name="alternate_phone" type="tel" /></Field>
              <Field label="Address" name="address"><Textarea name="address" rows={2} /></Field>
              <RelationshipFields />
              <div><SubmitButton size="sm">Add and link parent</SubmitButton></div>
            </ActionForm>
          </details>
        </Panel>

        <Panel title="Therapists">
          {current.length === 0 ? (
            <EmptyState title="No therapist assigned">Only assigned therapists can see and record this child&apos;s work.</EmptyState>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {current.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <Link href={`/admin/staff/${a.staff?.id}`} className="font-bold text-ink-600 hover:underline">{a.staff?.full_name}</Link>
                    <p className="text-sm text-ink-400">
                      {a.assignment_role ?? "Therapist"}, from {formatDate(a.starts_on)}
                      {!isActiveAssignment(a) ? " (starts later)" : ""}
                    </p>
                  </div>
                  <ActionButton action={endAssignment} fields={{ id: a.id }} label="End assignment" variant="ghost" confirm="End this assignment now? The therapist loses access to this child immediately." />
                </li>
              ))}
            </ul>
          )}

          <details className="mt-4 rounded-lg border border-line p-3">
            <summary className="cursor-pointer font-bold text-ink-600">Assign a therapist</summary>
            <ActionForm action={assignStaff} className="mt-3" resetOnSuccess>
              <input type="hidden" name="student_id" value={id} />
              <Field label="Therapist" name="staff_id">
                <Select name="staff_id" defaultValue="">
                  <option value="">Choose…</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}{s.staff_details?.designation ? `, ${s.staff_details.designation}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role with this child" name="assignment_role" hint="e.g. Primary therapist, Speech sessions">
                <Input name="assignment_role" />
              </Field>
              <Field label="Starts on" name="starts_on"><Input name="starts_on" type="date" defaultValue={todayIST()} /></Field>
              <div><SubmitButton size="sm">Assign</SubmitButton></div>
            </ActionForm>
          </details>

          {past.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-bold text-ink-400">Past therapists</p>
              <ul className="mt-1 text-sm text-ink-500">
                {past.map((a) => (
                  <li key={a.id}>
                    {a.staff?.full_name}: {formatDate(a.starts_on)} to {formatDate(a.ends_on)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function RelationshipFields() {
  return (
    <>
      <Field label="Relationship" name="relationship">
        <Select name="relationship" defaultValue="mother">
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>{humanize(r)}</option>
          ))}
        </Select>
      </Field>
      <Checkbox name="is_primary_contact" label="Primary contact for this child" />
    </>
  );
}
