import { z } from "zod";

import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { isoDateSchema, optionalText, optionalTime, uuidSchema } from "@/lib/validation/common";

export const attendanceRowSchema = z
  .object({
    student_id: uuidSchema,
    attendance_date: isoDateSchema,
    status: z.enum(ATTENDANCE_STATUSES),
    check_in: optionalTime,
    check_out: optionalTime,
    remarks: optionalText(500),
  })
  // Absent / leave never carry times (the database enforces this too).
  .transform((v) => (v.status === "absent" || v.status === "leave" ? { ...v, check_in: null, check_out: null } : v))
  .refine((v) => !v.check_in || !v.check_out || v.check_out >= v.check_in, {
    path: ["check_out"],
    message: "Check-out must be after check-in",
  });

export const registerDateSchema = z.object({ attendance_date: isoDateSchema });
