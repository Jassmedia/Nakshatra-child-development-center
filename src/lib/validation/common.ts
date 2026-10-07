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
