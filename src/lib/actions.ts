import type { z } from "zod";

/**
 * The shape every Server Action returns to its form (used with React useActionState).
 * fieldErrors are keyed by input `name`, so <Field name="..."> can show them.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Changes on every submit so forms can reset after success. */
  submittedAt?: number;
};

export const IDLE: ActionState = { status: "idle" };

export function success(message: string): ActionState {
  return { status: "success", message, submittedAt: Date.now() };
}

export function failure(message: string, fieldErrors?: ActionState["fieldErrors"]): ActionState {
  return { status: "error", message, fieldErrors, submittedAt: Date.now() };
}

/** Converts FormData into a plain object. Repeated keys (checkbox groups, multi-selects) become arrays. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (typeof value !== "string") continue;
    if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Validates FormData with a Zod schema. */
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.infer<T> } | { ok: false; state: ActionState } {
  const result = schema.safeParse(formDataToObject(formData));
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, state: failure("Please correct the highlighted fields.", fieldErrors) };
}

type DbError = { code?: string; message?: string; details?: string | null } | null | undefined;

/**
 * Translates a PostgreSQL/PostgREST error into a message a user can act on.
 * Raw database messages are never shown for unknown errors (they can leak internals).
 */
export function dbErrorMessage(error: DbError, fallback = "Something went wrong while saving. Try again."): string {
  if (!error) return fallback;
  switch (error.code) {
    case "23505":
      return "This record already exists (a value that must be unique is already in use).";
    case "23503":
      return "This record is linked to other records, so it cannot be changed this way.";
    case "23514":
    case "P0001":
      // Our own CHECK / RAISE messages are written for users.
      return error.message && !error.message.includes("violates check constraint")
        ? error.message
        : "Some values are not allowed. Check the form and try again.";
    case "42501":
      return "You do not have permission to do this.";
    case "PGRST116":
      return "Record not found, or you do not have access to it.";
    default:
      return fallback;
  }
}
