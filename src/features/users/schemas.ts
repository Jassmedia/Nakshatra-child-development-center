import { z } from "zod";

import { passwordSchema } from "@/features/auth/schemas";
import { emailSchema, optionalPhone, optionalText, requiredText, uuidSchema } from "@/lib/validation/common";

export const createUserSchema = z
  .object({
    full_name: requiredText(200, "Name"),
    email: emailSchema,
    role: z.enum(["admin", "staff", "parent"], { message: "Choose a role" }),
    phone: optionalPhone,
    designation: optionalText(120),
    // Empty => send an invitation email instead of setting a password now.
    password: z.union([z.literal(""), passwordSchema]).optional(),
  })
  .transform((v) => ({ ...v, password: v.password ? v.password : null }));

export const setActiveSchema = z.object({ id: uuidSchema, active: z.enum(["true", "false"]) });

export const resetPasswordSchema = z.object({ id: uuidSchema, password: passwordSchema });
