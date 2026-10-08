import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { Badge, Details, PageHeader, Panel } from "@/components/ui/layout";
import { resetUserPassword, setUserActive } from "@/features/users/actions";
import { getProfile } from "@/features/users/queries";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Account" };

export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  const me = await requireRole("admin");
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const user = await getProfile(id);
  if (!user) notFound();

  return (
    <>
      <PageHeader
        title={user.full_name || user.email || "Account"}
        back={<Link href="/admin/users" className="text-sm font-bold text-ink-600 hover:underline">Back to accounts</Link>}
        actions={user.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Details">
          <Details
            items={[
              ["Email", user.email],
              ["Role", ROLE_LABEL[user.role]],
              ["Phone", user.phone],
              ["Created", formatDate(user.created_at)],
            ]}
          />
        </Panel>

        <Panel title="Access">
          {user.id === me.id ? (
            <p className="text-sm text-ink-400">This is your own account. Another administrator can deactivate it.</p>
          ) : (
            <ActionForm action={setUserActive}>
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="active" value={user.is_active ? "false" : "true"} />
              <p className="text-sm text-ink-500">
                {user.is_active
                  ? "Deactivating stops sign-in immediately. Records they created stay in the history."
                  : "Reactivating lets this person sign in again with their existing password."}
              </p>
              <div>
                <SubmitButton variant={user.is_active ? "danger" : "primary"}>
                  {user.is_active ? "Deactivate account" : "Reactivate account"}
                </SubmitButton>
              </div>
            </ActionForm>
          )}
        </Panel>

        <Panel title="Set a new password">
          <ActionForm action={resetUserPassword} resetOnSuccess>
            <input type="hidden" name="id" value={user.id} />
            <Field label="New password" name="password" hint="8+ characters with upper, lower and a number.">
              <Input name="password" type="text" autoComplete="off" />
            </Field>
            <div>
              <SubmitButton variant="secondary">Set password</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
