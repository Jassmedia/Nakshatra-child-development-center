import type { Metadata } from "next";

import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { PageHeader, Panel } from "@/components/ui/layout";
import { updatePassword } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Change password" };

export default function PasswordPage() {
  return (
    <>
      <PageHeader title="Set a new password" description="At least 8 characters, with an uppercase letter, a lowercase letter and a number." />
      <Panel className="max-w-md">
        <ActionForm action={updatePassword} resetOnSuccess>
          <Field label="New password" name="password" required>
            <Input name="password" type="password" autoComplete="new-password" />
          </Field>
          <Field label="Repeat new password" name="confirm" required>
            <Input name="confirm" type="password" autoComplete="new-password" />
          </Field>
          <div>
            <SubmitButton>Save password</SubmitButton>
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}
