import { z } from "zod";

import { emailSchema, optionalText, phoneSchema, requiredText } from "@/lib/validation/common";

/** Matches the Supabase Auth password policy (supabase/config.toml): min 8, letters and digits. */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const ownProfileSchema = z.object({
  full_name: requiredText(200, "Name"),
  phone: z.union([z.literal(""), phoneSchema]).transform((v) => (v === "" ? null : v)),
});

/** Only allow redirects to paths inside this app (blocks open-redirect tricks like //evil.com). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export { optionalText };
