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

export const ACTIVITY_KINDS = ["activity", "workout"] as const;
export const ACTIVITY_STATUSES = ["scheduled", "completed", "partially_completed", "not_completed", "cancelled"] as const;
export const ACTIVITY_CATEGORIES = [
  "Speech & language",
  "Occupational therapy",
  "Physiotherapy / motor",
  "Sensory",
  "Cognitive",
  "Social & play",
  "Behaviour",
  "Self-care",
  "Academic readiness",
  "Other",
] as const;
export const ATTENDANCE_STATUSES = ["present", "late", "absent", "leave"] as const;

export const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  partially_completed: "Partly done",
  not_completed: "Not done",
  cancelled: "Cancelled",
};

export const ATTENDANCE_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  leave: "On leave",
};

export const DEVELOPMENT_AREAS = [
  "Speech & language",
  "Fine motor",
  "Gross motor",
  "Sensory processing",
  "Cognitive",
  "Social & emotional",
  "Behaviour",
  "Self-care",
  "Academic readiness",
  "Overall",
] as const;

export const TRENDS = ["improving", "steady", "needs_attention"] as const;
export const TREND_LABEL: Record<string, string> = {
  improving: "Improving",
  steady: "Steady",
  needs_attention: "Needs attention",
};
export const LEVEL_LABEL: Record<number, string> = {
  1: "Emerging",
  2: "With a lot of support",
  3: "With some support",
  4: "Mostly independent",
  5: "Independent",
};
