"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { getPublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { createUserSchema, resetPasswordSchema, setActiveSchema } from "./schemas";

/**
 * Creates a login (Admin only). The role goes into app_metadata, which only the
 * secret key can set; the database trigger copies it into profiles.
 * With a password: the account works immediately (hand the password over in person).
 * Without one: Supabase emails an invitation link to choose a password.
 */
export async function createUserAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(createUserSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { email, full_name, role, phone, designation, password } = parsed.data;

  const admin = createAdminClient();
  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();

  const created = password
    ? await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: { full_name },
      })
    : await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name },
        redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/account/password`,
      });

  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? "";
    if (/already|registered|exists/i.test(msg)) {
      return failure("An account with this email already exists.", { email: ["Already in use"] });
    }
    return failure(password ? "Could not create the account. Try again." : "Could not send the invitation. Check the email settings, or set a password instead.");
  }

  const userId = created.data.user.id;
  // inviteUserByEmail cannot set app_metadata, so set the role afterwards.
  if (!password) {
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
    await admin.from("profiles").update({ role }).eq("id", userId);
  }

  // Remaining profile details go through the normal (RLS-checked) client as the admin.
  const supabase = await createClient();
  await supabase.from("profiles").update({ full_name, phone }).eq("id", userId);
  if (role === "staff") {
    await supabase.from("staff_details").insert({ profile_id: userId, designation });
  }

  revalidatePath("/admin/users");
  return success(
    password
      ? `Account created for ${full_name}. They can sign in now with the password you set.`
      : `Invitation sent to ${email}.`,
  );
}

export async function setUserActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = parseForm(setActiveSchema, formData);
  if (!parsed.ok) return failure("Invalid request.");
  const { id } = parsed.data;
  const active = parsed.data.active === "true";

  if (id === me.id && !active) return failure("You cannot deactivate your own account.");

  // 1) Database: RLS + trigger protect this (only admins; never the last admin).
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", id);
  if (error) return failure(dbErrorMessage(error));

  // 2) Auth: block/unblock sign-in as well.
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return success(active ? "Account reactivated." : "Account deactivated. The person can no longer sign in.");
}

export async function resetUserPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(resetPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.id, { password: parsed.data.password });
  if (error) return failure("Could not set the password. Try again.");
  return success("New password set. Share it with the person and ask them to change it after signing in.");
}
