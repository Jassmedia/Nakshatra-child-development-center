import type { Metadata } from "next";

import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { Details, PageHeader, Panel } from "@/components/ui/layout";
import { updateOwnProfile } from "@/features/auth/actions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireRole("admin", "staff", "parent");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();

  return (
    <>
      <PageHeader title="My account" description="Your sign-in details and contact information." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sign-in">
          <Details items={[["Email", user.email], ["Role", ROLE_LABEL[user.role]]]} />
          <LinkButton href="/account/password" variant="secondary" className="mt-4">
            Change password
          </LinkButton>
        </Panel>
        <Panel title="Your details">
          <ActionForm action={updateOwnProfile}>
            <Field label="Full name" name="full_name" required>
              <Input name="full_name" defaultValue={profile?.full_name ?? ""} autoComplete="name" />
            </Field>
            <Field label="Phone" name="phone" hint="Optional. Example: +91 98765 43210">
              <Input name="phone" type="tel" defaultValue={profile?.phone ?? ""} autoComplete="tel" />
            </Field>
            <div>
              <SubmitButton>Save details</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
