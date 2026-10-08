import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { requestPasswordReset } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 text-[15px] text-ink-400">
        Enter your email. We&apos;ll send a link to choose a new password.
      </p>
      <ActionForm action={requestPasswordReset} className="mt-6" inlineSuccess>
        <Field label="Email" name="email">
          <Input name="email" type="email" autoComplete="email" inputMode="email" required />
        </Field>
        <SubmitButton pendingText="Sending…" className="w-full">
          Send reset link
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm">
        <Link href="/login" className="font-bold text-ink-600 underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
