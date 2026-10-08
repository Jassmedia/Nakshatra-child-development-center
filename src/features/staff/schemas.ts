import { z } from "zod";

import { isoDateSchema, optionalDate, optionalPhone, optionalText, requiredText, uuidSchema } from "@/lib/validation/common";

export const staffDetailsSchema = z.object({
  id: uuidSchema,
  full_name: requiredText(200, "Name"),
  phone: optionalPhone,
  designation: optionalText(120),
  specialization: optionalText(200),
  qualification: optionalText(200),
  joined_on: optionalDate,
});

export const assignSchema = z.object({
  student_id: uuidSchema.or(z.literal("")).refine((v) => v !== "", "Choose a student"),
  staff_id: uuidSchema.or(z.literal("")).refine((v) => v !== "", "Choose a therapist"),
  assignment_role: optionalText(120),
  starts_on: isoDateSchema,
  notes: optionalText(1000),
  return_to: z.enum(["student", "staff"]).default("student"),
});

export const endAssignmentSchema = z.object({ id: uuidSchema, ends_on: isoDateSchema });
