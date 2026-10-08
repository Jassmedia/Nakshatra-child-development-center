import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { signIn } from "@/features/auth/actions";
import { ROLE_HOME } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  const linkError = params.error === "link";

  return (
    <>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-[15px] text-ink-400">Use the email and password the center gave you.</p>

      {linkError ? (
        <p role="alert" className="mt-6 rounded-lg border border-rose-600/40 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          That link has expired or was already used. Request a new one below.
        </p>
      ) : null}

      <ActionForm action={signIn} className="mt-6">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email">
          <Input name="email" type="email" autoComplete="email" inputMode="email" required />
        </Field>
        <Field label="Password" name="password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton pendingText="Signing in…" className="mt-2 w-full">
          Sign in
        </SubmitButton>
      </ActionForm>

      <p className="mt-6 text-sm">
        <Link href="/forgot-password" className="font-bold text-ink-600 underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </p>
      <p className="mt-8 text-xs leading-5 text-ink-400">
        Accounts are created by the center. If you are a parent and don&apos;t have one yet, ask the front desk.
      </p>
    </>
  );
}
