import { z } from "zod";

import { ACTIVITY_KINDS, ACTIVITY_STATUSES } from "@/lib/constants";
import { checkbox, isoDateSchema, optionalInt, optionalText, optionalTime, requiredText, uuidSchema } from "@/lib/validation/common";

export const catalogueSchema = z.object({
  id: uuidSchema.optional(),
  name: requiredText(150, "Name"),
  kind: z.enum(ACTIVITY_KINDS),
  category: optionalText(60),
  description: optionalText(2000),
  default_duration_min: optionalInt(1, 480),
  is_active: checkbox,
});

export const newStudentActivitySchema = z
  .object({
    student_id: uuidSchema,
    activity_id: z.union([z.literal(""), uuidSchema]).optional().transform((v) => (v ? v : null)),
    title: optionalText(150),
    kind: z.enum(ACTIVITY_KINDS).default("activity"),
    category: optionalText(60),
    scheduled_date: isoDateSchema,
    scheduled_time: optionalTime,
    duration_min: optionalInt(1, 480),
    goal: optionalText(1000),
    repeat_days: optionalInt(1, 60).transform((v) => v ?? 1),
    skip_sundays: checkbox,
  })
  .refine((v) => v.activity_id || v.title, { path: ["title"], message: "Choose from the list or type a name" });

export const updateStudentActivitySchema = z.object({
  id: uuidSchema,
  status: z.enum(ACTIVITY_STATUSES),
  performance_rating: optionalInt(1, 5),
  staff_remarks: optionalText(2000),
});
