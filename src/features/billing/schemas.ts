import { z } from "zod";

import { PAYMENT_METHODS } from "@/lib/constants";
import { checkbox, isoDateSchema, moneySchema, optionalDate, optionalText, requiredText, uuidSchema } from "@/lib/validation/common";

const feeFields = {
  title: requiredText(150, "Description"),
  period_start: optionalDate,
  period_end: optionalDate,
  amount: moneySchema("Amount"),
  discount: z.union([z.literal(""), moneySchema("Discount", { allowZero: true })]).optional().transform((v) => (v ? v : "0")),
  due_date: isoDateSchema,
  remarks: optionalText(1000),
};

const discountOk = (v: { amount: string; discount: string }) => Number(v.discount) <= Number(v.amount);

export const newFeeSchema = z
  .object({
    ...feeFields,
    all_active: checkbox,
    student_id: z.union([z.literal(""), uuidSchema]).optional(),
  })
  .refine(discountOk, { path: ["discount"], message: "Discount cannot be more than the amount" })
  .refine((v) => v.all_active || v.student_id, { path: ["student_id"], message: "Choose a student, or tick “all active students”" });

export const editFeeSchema = z
  .object({ id: uuidSchema, ...feeFields })
  .refine(discountOk, { path: ["discount"], message: "Discount cannot be more than the amount" });

export const paymentSchema = z.object({
  fee_id: uuidSchema,
  amount: moneySchema("Amount"),
  payment_date: isoDateSchema,
  method: z.enum(PAYMENT_METHODS, { message: "Choose how it was paid" }),
  reference: optionalText(120),
  remarks: optionalText(1000),
});

export const voidSchema = z.object({ id: uuidSchema, void_reason: requiredText(500, "Reason") });
export const cancelFeeSchema = z.object({ id: uuidSchema, cancelled_reason: requiredText(500, "Reason") });
