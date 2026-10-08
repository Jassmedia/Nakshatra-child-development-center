"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, Input, SubmitButton } from "@/components/ui/form";
import { Badge } from "@/components/ui/layout";
import { IDLE } from "@/lib/actions";

import { createParentLogin } from "../actions";

/**
 * Stays mounted when the page refreshes after the login is created, so the
 * one-time password remains visible for the admin to hand over.
 */
export function ParentLoginPanel({
  parentId,
  email,
  login,
}: {
  parentId: string;
  email: string | null;
  login: { id: string; email: string | null; is_active: boolean } | null;
}) {
  const [state, action] = useActionState(createParentLogin, IDLE);

  return (
    <div className="flex flex-col gap-3">
      {state.status === "success" ? (
        <div role="status" className="rounded-lg border border-sage-600/40 bg-sage-50 px-3 py-2 text-sm text-sage-800">
          <p className="font-bold">Login created</p>
          <p className="mt-1 break-words">{state.message}</p>
        </div>
      ) : null}
      {login ? (
        <>
          <p className="text-[15px]">
            Signs in as <strong>{login.email}</strong>
          </p>
          <div>{login.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}</div>
          <Link href={`/admin/users/${login.id}`} className="text-sm font-bold text-ink-600 hover:underline">
            Manage this login
          </Link>
        </>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          {state.status === "error" ? (
            <p role="alert" className="rounded-lg border border-rose-600/40 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {state.message}
            </p>
          ) : null}
          <input type="hidden" name="parent_id" value={parentId} />
          <p className="text-sm text-ink-500">
            {email ? (
              <>Creates a login for <strong>{email}</strong>. They will see only their own children.</>
            ) : (
              "Add an email address first. It is the parent's sign-in name."
            )}
          </p>
          <Field label="Starting password" name="password" hint="Leave empty to generate one. It is shown once after creating.">
            <Input name="password" type="text" autoComplete="off" />
          </Field>
          <div>
            <SubmitButton disabled={!email}>Create login</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
