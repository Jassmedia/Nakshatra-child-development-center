import { z } from "zod";

import { TRENDS } from "@/lib/constants";
import { addDays, todayIST } from "@/lib/utils";
import { checkbox, isoDateSchema, optionalInt, optionalText, requiredText, uuidSchema } from "@/lib/validation/common";

export const progressSchema = z
  .object({
    id: uuidSchema.optional(),
    student_id: uuidSchema,
    record_date: isoDateSchema,
    area: requiredText(60, "Area"),
    level: optionalInt(1, 5),
    trend: z.enum(TRENDS),
    observations: requiredText(4000, "Observations"),
    improvements: optionalText(4000),
    attention_areas: optionalText(4000),
    recommendations: optionalText(4000),
    shared_with_parent: checkbox,
  })
  .refine((v) => v.record_date <= addDays(todayIST(), 0), { path: ["record_date"], message: "The date cannot be in the future" });
