import { z } from "zod";

import { BLOOD_GROUPS, GENDERS, STUDENT_STATUSES } from "@/lib/constants";
import { todayIST } from "@/lib/utils";
import { isoDateSchema, optionalDate, optionalEnum, optionalText, requiredText, uuidSchema } from "@/lib/validation/common";

export const studentSchema = z
  .object({
    id: uuidSchema.optional(),
    full_name: requiredText(200, "Name"),
    admission_number: optionalText(40),
    date_of_birth: optionalDate,
    gender: optionalEnum(GENDERS),
    blood_group: optionalEnum(BLOOD_GROUPS),
    enrollment_date: isoDateSchema,
    status: z.enum(STUDENT_STATUSES).default("active"),
    discharged_on: optionalDate,
    diagnosis: optionalText(2000),
    medical_notes: optionalText(4000),
    school_name: optionalText(200),
    address: optionalText(500),
    notes: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.date_of_birth && v.date_of_birth > todayIST()) {
      ctx.addIssue({ code: "custom", path: ["date_of_birth"], message: "Date of birth cannot be in the future" });
    }
    if (v.discharged_on && v.discharged_on < v.enrollment_date) {
      ctx.addIssue({ code: "custom", path: ["discharged_on"], message: "Discharge date must be on or after enrolment" });
    }
  })
  // Keep status and discharge date consistent (the DB enforces this too).
  .transform((v) => ({
    ...v,
    discharged_on: v.status === "discharged" ? (v.discharged_on ?? todayIST()) : null,
  }));

export type StudentInput = z.infer<typeof studentSchema>;
