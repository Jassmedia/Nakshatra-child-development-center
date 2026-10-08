/** Choice lists shared by forms, validation and labels. They mirror the database CHECK constraints. */

export const GENDERS = ["male", "female", "other"] as const;
export const STUDENT_STATUSES = ["active", "on_hold", "discharged"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const RELATIONSHIPS = ["mother", "father", "guardian", "other"] as const;

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  discharged: "Discharged",
};
