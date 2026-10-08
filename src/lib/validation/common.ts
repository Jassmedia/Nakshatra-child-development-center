import { z } from "zod";

/**
 * Shared input validation building blocks.
 * They mirror the CHECK constraints in the database so users get a friendly
 * message in the form, while the database remains the final guard.
 */

export const uuidSchema = z.uuid();

/** Matches the DB check: optional '+', then 7–20 digits, spaces, dashes or parentheses. */
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, "Enter a valid phone number, e.g. +91 98765 43210");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

/** Required text with a maximum length (trimmed). */
export function requiredText(max: number, label = "This field") {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
}

/** Optional text: empty strings from forms become null. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();
}

/** A calendar date in YYYY-MM-DD form (as sent by <input type="date">). */
export const isoDateSchema = z.iso.date();

/** Optional date from a form: "" becomes null. */
export const optionalDate = z
  .union([z.literal(""), isoDateSchema])
  .optional()
  .transform((v) => (v ? v : null));

/** Optional choice from a <select>: "" becomes null. */
export function optionalEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .union([z.literal(""), z.enum(values)])
    .optional()
    .transform((v) => (v ? (v as T[number]) : null));
}

/** Checkbox: present ("on") => true, absent => false. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

/** Optional phone number from a form. */
export const optionalPhone = z
  .union([z.literal(""), phoneSchema])
  .optional()
  .transform((v) => (v ? v : null));

/** Optional email from a form. */
export const optionalEmail = z
  .union([z.literal(""), emailSchema])
  .optional()
  .transform((v) => (v ? v : null));

/** Optional whole number from a form input: "" becomes null. */
export function optionalInt(min: number, max: number) {
  return z
    .union([z.literal(""), z.coerce.number().int(`Enter a whole number`).min(min, `Minimum ${min}`).max(max, `Maximum ${max}`)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));
}

/** Optional time from <input type="time">: "" becomes null. */
export const optionalTime = z
  .union([z.literal(""), z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Enter a time like 09:30")])
  .optional()
  .transform((v) => (v ? v : null));
