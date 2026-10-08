"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { failure, parseForm, success, type ActionState } from "@/lib/actions";
import { ROLE_HOME, isAppRole } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { forgotPasswordSchema, newPasswordSchema, ownProfileSchema, safeNextPath, signInSchema } from "./schemas";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(signInSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { email, password, next } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Same message for "no such user" and "wrong password": don't reveal which emails exist.
    return failure("Email or password is incorrect.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active || !isAppRole(profile.role)) {
    await supabase.auth.signOut();
    return failure("This account is deactivated. Contact the center administrator.");
  }

  redirect(safeNextPath(next) ?? ROLE_HOME[profile.role]);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(forgotPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/account/password`,
  });
  // Always the same answer, whether or not the email exists.
  return success("If an account exists for that email, a link to set a new password is on its way.");
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = parseForm(newPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return failure(
      error.code === "same_password"
        ? "The new password must be different from the current one."
        : "Could not change the password. Try again.",
    );
  }
  return success("Password changed.");
}

export async function updateOwnProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = parseForm(ownProfileSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) return failure("Could not save your details. Check the phone number and try again.");

  revalidatePath("/", "layout");
  return success("Your details are saved.");
}
