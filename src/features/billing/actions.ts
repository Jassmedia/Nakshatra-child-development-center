"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dbErrorMessage, failure, parseForm, success, type ActionState } from "@/lib/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { cancelFeeSchema, editFeeSchema, newFeeSchema, paymentSchema, voidSchema } from "./schemas";

const refresh = () => revalidatePath("/", "layout");

/** Creates a fee for one student, or the same fee for every active student. */
export async function createFee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(newFeeSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { all_active, student_id, ...fee } = parsed.data;
  const supabase = await createClient();

  let studentIds: string[];
  if (all_active) {
    const { data } = await supabase.from("students").select("id").eq("status", "active");
    studentIds = (data ?? []).map((s) => s.id);
    if (studentIds.length === 0) return failure("There are no active students.");
  } else {
    studentIds = [student_id!];
  }

  // Amounts stay strings so they reach numeric(12,2) exactly.
  const rows = studentIds.map((id) => ({ ...fee, student_id: id, amount: fee.amount as unknown as number, discount: fee.discount as unknown as number }));
  const { data, error } = await supabase.from("fees").insert(rows).select("id");
  if (error || !data) return failure(dbErrorMessage(error));
  refresh();
  if (data.length === 1) redirect(`/admin/billing/${data[0].id}`);
  return success(`Fee created for ${data.length} students.`);
}

export async function updateFee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(editFeeSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, amount, discount, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("fees")
    .update({ ...rest, amount: amount as unknown as number, discount: discount as unknown as number })
    .eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Fee updated.");
}

export async function recordPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(paymentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { amount, ...rest } = parsed.data;
  const supabase = await createClient();
  // student_id and receipt_number are filled in by the database.
  const { error } = await supabase
    .from("payments")
    .insert({ ...rest, amount: amount as unknown as number, student_id: "00000000-0000-0000-0000-000000000000" });
  if (error) return failure(dbErrorMessage(error), error.code === "P0001" ? { amount: [error.message] } : undefined);
  refresh();
  return success(`Payment of ₹${amount} recorded.`);
}

export async function voidPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ voided: true, void_reason: parsed.data.void_reason })
    .eq("id", parsed.data.id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Payment voided. It stays in the history, struck through.");
}

export async function cancelFee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseForm(cancelFeeSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase
    .from("fees")
    .update({ status: "cancelled", cancelled_reason: parsed.data.cancelled_reason })
    .eq("id", parsed.data.id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Fee cancelled.");
}
