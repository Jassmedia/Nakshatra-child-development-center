import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/form";
import type { Tables } from "@/types/database";

import { saveParent } from "../actions";

export function ParentForm({ parent }: { parent?: Tables<"parents"> }) {
  return (
    <ActionForm action={saveParent}>
      {parent ? <input type="hidden" name="id" value={parent.id} /> : null}
      <Field label="Full name" name="full_name" required>
        <Input name="full_name" defaultValue={parent?.full_name} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone"><Input name="phone" type="tel" defaultValue={parent?.phone ?? ""} /></Field>
        <Field label="Alternate phone" name="alternate_phone"><Input name="alternate_phone" type="tel" defaultValue={parent?.alternate_phone ?? ""} /></Field>
      </div>
      <Field label="Email" name="email" hint="Used as the sign-in name for the parent portal">
        <Input name="email" type="email" defaultValue={parent?.email ?? ""} />
      </Field>
      <Field label="Address" name="address"><Textarea name="address" rows={2} defaultValue={parent?.address ?? ""} /></Field>
      <div><SubmitButton>{parent ? "Save changes" : "Add parent"}</SubmitButton></div>
    </ActionForm>
  );
}
