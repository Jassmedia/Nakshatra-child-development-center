/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

/** Money is stored as numeric in Postgres and arrives as a number or string. */
export function formatMoney(value: number | string | null | undefined): string {
  return INR.format(Number(value ?? 0));
}

/** "2026-10-08" -> "8 Oct 2026" (no timezone shifts: dates are calendar dates). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/** Today's calendar date in India (the center's timezone), as YYYY-MM-DD. */
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Age in whole years from a date of birth. */
export function ageFrom(dob: string | null | undefined): string {
  if (!dob) return "—";
  const today = todayIST();
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = dob.split("-").map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age -= 1;
  return age < 1 ? "Under 1" : `${age} yrs`;
}

/** Turns "partially_paid" into "Partially paid". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
