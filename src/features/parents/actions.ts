"use server";

import { randomBytes, randomInt } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { passwordSchema } from "@/features/auth/schemas";
import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { createAndLinkSchema, linkExistingSchema, linkIdSchema, parentLoginSchema, parentSchema } from "./schemas";

function refresh(studentId?: string, parentId?: string) {
  revalidatePath("/admin/parents");
  if (studentId) revalidatePath(`/admin/students/${studentId}`);
  if (parentId) revalidatePath(`/admin/parents/${parentId}`);
}

export async function saveParent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = parseForm(parentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("parents").update(fields).eq("id", id);
    if (error) return failure(dbErrorMessage(error));
    refresh(undefined, id);
    return success("Parent details saved.");
  }
  const { data, error } = await supabase.from("parents").insert({ ...fields, created_by: me.id }).select("id").single();
  if (error || !data) return failure(dbErrorMessage(error));
  refresh();
  redirect(`/admin/parents/${data.id}`);
}

/** Only one primary contact per child (also enforced by a unique index). */
async function clearPrimary(studentId: string) {
  const supabase = await createClient();
  await supabase.from("student_parents").update({ is_primary_contact: false }).eq("student_id", studentId);
}

export async function linkExistingParent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(linkExistingSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { student_id, parent_id, relationship, is_primary_contact } = parsed.data;

  if (is_primary_contact) await clearPrimary(student_id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_parents")
    .insert({ student_id, parent_id, relationship, is_primary_contact });
  if (error) {
    return error.code === "23505" ? failure("This parent is already linked to the child.") : failure(dbErrorMessage(error));
  }
  refresh(student_id, parent_id);
  return success("Parent linked.");
}

export async function createAndLinkParent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = parseForm(createAndLinkSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { student_id, relationship, is_primary_contact, ...fields } = parsed.data;

  const supabase = await createClient();
  const { data: parent, error } = await supabase
    .from("parents")
    .insert({ ...fields, created_by: me.id })
    .select("id")
    .single();
  if (error || !parent) return failure(dbErrorMessage(error));

  if (is_primary_contact) await clearPrimary(student_id);
  const link = await supabase
    .from("student_parents")
    .insert({ student_id, parent_id: parent.id, relationship, is_primary_contact });
  if (link.error) return failure(dbErrorMessage(link.error));

  refresh(student_id, parent.id);
  return success(`${fields.full_name} added and linked.`);
}

export async function makePrimaryContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(linkIdSchema, formData);
  if (!parsed.ok) return failure("Invalid request.");
  await clearPrimary(parsed.data.student_id);
  const supabase = await createClient();
  const { error } = await supabase.from("student_parents").update({ is_primary_contact: true }).eq("id", parsed.data.id);
  if (error) return failure(dbErrorMessage(error));
  refresh(parsed.data.student_id);
  return success("Primary contact updated.");
}

export async function unlinkParent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(linkIdSchema, formData);
  if (!parsed.ok) return failure("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.from("student_parents").delete().eq("id", parsed.data.id);
  if (error) return failure(dbErrorMessage(error));
  refresh(parsed.data.student_id);
  return success("Parent unlinked. The change is recorded in the history.");
}

/**
 * Gives a parent contact a login so they can use the parent portal.
 * Uses the secret key only for the Auth call; linking is done as the admin (RLS-checked).
 */
export async function createParentLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(parentLoginSchema, formData);
  if (!parsed.ok) return failure("Invalid request.");
  const supabase = await createClient();

  const { data: parent } = await supabase
    .from("parents")
    .select("id, full_name, email, phone, profile_id")
    .eq("id", parsed.data.parent_id)
    .single();
  if (!parent) return failure("Parent not found.");
  if (parent.profile_id) return failure("This parent already has a login.");
  if (!parent.email) return failure("Add an email address to this parent first. It is their sign-in name.");

  let password = parsed.data.password?.trim() ?? "";
  if (password) {
    const check = passwordSchema.safeParse(password);
    if (!check.success) return failure("Password is too weak.", { password: [check.error.issues[0].message] });
  } else {
    // Readable one-time password the admin hands over; the parent changes it after signing in.
    password = `Nk${randomBytes(4).toString("hex")}#${randomInt(10, 99)}`;
  }

  // Reuse an existing parent login with the same email (e.g. created from User accounts).
  const { data: existing } = await supabase.from("profiles").select("id, role").eq("email", parent.email).maybeSingle();
  let profileId = existing?.id;
  if (existing && existing.role !== "parent") return failure("This email belongs to a staff or admin account.");
  const admin = createAdminClient();
  if (!profileId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: parent.email,
      password,
      email_confirm: true,
      app_metadata: { role: "parent" },
      user_metadata: { full_name: parent.full_name },
    });
    if (error || !data.user) return failure("Could not create the login. Try again.");
    profileId = data.user.id;
    await supabase.from("profiles").update({ phone: parent.phone }).eq("id", profileId);
  }

  const { error } = await supabase.from("parents").update({ profile_id: profileId }).eq("id", parent.id);
  if (error) return failure(dbErrorMessage(error, "That login is already linked to another parent record."));
  refresh(undefined, parent.id);
  return success(
    existing
      ? `Linked to the existing login ${parent.email}.`
      : `Sign-in: ${parent.email}. Password: ${password}. Share it privately; they can change it under My account.`,
  );
}
