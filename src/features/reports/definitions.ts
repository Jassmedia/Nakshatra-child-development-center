/** Report catalogue: shared by the page, the CSV export and the role checks. */
export const REPORTS = {
  attendance: { label: "Attendance", billing: false, description: "Present, late, absent and leave per child, with attendance rate." },
  activities: { label: "Activity completion", billing: false, description: "Planned vs completed activities and workouts per child." },
  "parent-tasks": { label: "Parent task completion", billing: false, description: "Home tasks assigned, done and overdue per child." },
  progress: { label: "Progress", billing: false, description: "Progress updates in the period, by child and area." },
  "pending-assignments": { label: "Pending assignments", billing: false, description: "Home tasks still waiting for parents, oldest due first." },
  "pending-payments": { label: "Pending payments", billing: true, description: "Fees not fully paid, with days overdue." },
  "payment-history": { label: "Payment history", billing: true, description: "Payments received in the period, with totals." },
} as const;

export type ReportKey = keyof typeof REPORTS;

export function isReportKey(v: string): v is ReportKey {
  return v in REPORTS;
}

export type Cell = string | number | null;
export type ReportResult = {
  columns: Array<{ key: string; label: string; align?: "right" }>;
  rows: Array<Record<string, Cell>>;
  totals?: Record<string, Cell>;
  note?: string;
};
