import { z } from "zod";

import { RELATIONSHIPS } from "@/lib/constants";
import { checkbox, optionalEmail, optionalPhone, optionalText, requiredText, uuidSchema } from "@/lib/validation/common";

const parentFields = {
  full_name: requiredText(200, "Name"),
  phone: optionalPhone,
  alternate_phone: optionalPhone,
  email: optionalEmail,
  address: optionalText(500),
};

const needsContact = (v: { phone: string | null; email: string | null }) => Boolean(v.phone || v.email);
const contactIssue = { path: ["phone"], message: "Enter a phone number or an email so the center can reach this parent" };

export const parentSchema = z.object({ id: uuidSchema.optional(), ...parentFields }).refine(needsContact, contactIssue);

export const linkExistingSchema = z.object({
  student_id: uuidSchema,
  parent_id: uuidSchema.or(z.literal("")).refine((v) => v !== "", "Choose a parent"),
  relationship: z.enum(RELATIONSHIPS, { message: "Choose the relationship" }),
  is_primary_contact: checkbox,
});

export const createAndLinkSchema = z
  .object({
    student_id: uuidSchema,
    relationship: z.enum(RELATIONSHIPS, { message: "Choose the relationship" }),
    is_primary_contact: checkbox,
    ...parentFields,
  })
  .refine(needsContact, contactIssue);

export const linkIdSchema = z.object({ id: uuidSchema, student_id: uuidSchema });

export const parentLoginSchema = z.object({
  parent_id: uuidSchema,
  password: z.string().optional(),
});
