import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { BackLink } from "@/components/ui/back-link";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { Badge, EmptyState, PageHeader, Panel, Table, Td, Th } from "@/components/ui/layout";
import { assignStaff, endAssignment, saveStaffDetails } from "@/features/staff/actions";
import { getStaff, getStaffAssignments, isActiveAssignment, isOpenAssignment } from "@/features/staff/queries";
import { studentOptions } from "@/features/students/queries";
import { formatDate, todayIST } from "@/lib/utils";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Staff member" };

export default async function StaffMemberPage({ params }: PageProps<"/admin/staff/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const [staff, assignments, students] = await Promise.all([getStaff(id), getStaffAssignments(id), studentOptions()]);
  if (!staff) notFound();
  const d = staff.staff_details;
  const today = todayIST();

  return (
    <>
      <PageHeader
        title={staff.full_name || staff.email || "Staff member"}
        back={<BackLink href="/admin/staff">Staff</BackLink>}
        description={staff.email}
        actions={
          <>
            {staff.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}
            <Link href={`/admin/users/${staff.id}`} className="text-sm font-bold text-ink-600 hover:underline">Login and access</Link>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Details">
          <ActionForm action={saveStaffDetails}>
            <input type="hidden" name="id" value={staff.id} />
            <Field label="Full name" name="full_name" required><Input name="full_name" defaultValue={staff.full_name} /></Field>
            <Field label="Phone" name="phone"><Input name="phone" type="tel" defaultValue={staff.phone ?? ""} /></Field>
            <Field label="Designation" name="designation" hint="e.g. Speech Therapist"><Input name="designation" defaultValue={d?.designation ?? ""} /></Field>
            <Field label="Specialization" name="specialization"><Input name="specialization" defaultValue={d?.specialization ?? ""} /></Field>
            <Field label="Qualification" name="qualification"><Input name="qualification" defaultValue={d?.qualification ?? ""} /></Field>
            <Field label="Joined on" name="joined_on"><Input name="joined_on" type="date" defaultValue={d?.joined_on ?? ""} /></Field>
            <div><SubmitButton>Save details</SubmitButton></div>
          </ActionForm>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Assigned students" padded={false}>
            {assignments.length === 0 ? (
              <div className="p-4"><EmptyState title="No students assigned yet" /></div>
            ) : (
              <Table>
                <thead><tr><Th>Student</Th><Th>Role</Th><Th>From</Th><Th>Ended</Th><Th></Th></tr></thead>
                <tbody>
                  {assignments.map((a) => {
                    const open = isOpenAssignment(a, today);
                    return (
                      <tr key={a.id} className={open ? "" : "text-ink-400"}>
                        <Td>
                          <Link href={`/admin/students/${a.student?.id}`} className="font-bold text-ink-600 hover:underline">{a.student?.full_name}</Link>
                          {open && !isActiveAssignment(a) ? <span className="ml-2"><Badge tone="info">Starts later</Badge></span> : null}
                        </Td>
                        <Td>{a.assignment_role ?? "—"}</Td>
                        <Td>{formatDate(a.starts_on)}</Td>
                        <Td>{a.ends_on ? formatDate(a.ends_on) : "Ongoing"}</Td>
                        <Td>{open ? <ActionButton action={endAssignment} fields={{ id: a.id }} label="End" variant="ghost" confirm="End this assignment now? The therapist loses access immediately." /> : null}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Panel>
          <Panel title="Assign a student">
            <ActionForm action={assignStaff} resetOnSuccess>
              <input type="hidden" name="staff_id" value={staff.id} />
              <input type="hidden" name="return_to" value="staff" />
              <Field label="Student" name="student_id">
                <Select name="student_id" defaultValue="">
                  <option value="">Choose…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role with this child" name="assignment_role"><Input name="assignment_role" /></Field>
                <Field label="Starts on" name="starts_on"><Input name="starts_on" type="date" defaultValue={today} /></Field>
              </div>
              <div><SubmitButton>Assign student</SubmitButton></div>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
