import { z } from "zod";

import { optionalDate, optionalText, requiredText, uuidSchema } from "@/lib/validation/common";

export const assignmentSchema = z.object({
  id: uuidSchema.optional(),
  student_id: uuidSchema,
  title: requiredText(150, "Title"),
  instructions: optionalText(4000),
  due_date: optionalDate,
});

export const reviewSchema = z.object({
  id: uuidSchema,
  decision: z.enum(["reviewed", "pending"]),
  staff_feedback: optionalText(4000),
});

export const completeSchema = z.object({ id: uuidSchema, comment: optionalText(2000) });

export const commentSchema = z.object({ assignment_id: uuidSchema, body: requiredText(2000, "Comment") });
