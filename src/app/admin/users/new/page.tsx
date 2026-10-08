import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { PageHeader, Panel } from "@/components/ui/layout";
import { createUserAccount } from "@/features/users/actions";

export const metadata: Metadata = { title: "Create account" };

export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="Create an account"
        back={<Link href="/admin/users" className="text-sm font-bold text-ink-600 hover:underline">Back to accounts</Link>}
        description="Parents get their child linked from the student's page. Therapists are assigned to students from the staff page."
      />
      <Panel className="max-w-2xl">
        <ActionForm action={createUserAccount} resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="full_name" required>
              <Input name="full_name" autoComplete="off" />
            </Field>
            <Field label="Email" name="email" required>
              <Input name="email" type="email" autoComplete="off" />
            </Field>
            <Field label="Role" name="role" required>
              <Select name="role" defaultValue="staff">
                <option value="staff">Staff / Therapist</option>
                <option value="parent">Parent</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
            <Field label="Phone" name="phone" hint="Optional">
              <Input name="phone" type="tel" />
            </Field>
            <Field label="Designation" name="designation" hint="Staff only, e.g. Speech Therapist">
              <Input name="designation" />
            </Field>
            <Field
              label="Starting password"
              name="password"
              hint="Leave empty to email an invitation instead. Needs 8+ characters with upper, lower and a number."
            >
              <Input name="password" type="text" autoComplete="off" />
            </Field>
          </div>
          <div>
            <SubmitButton pendingText="Creating…">Create account</SubmitButton>
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}
