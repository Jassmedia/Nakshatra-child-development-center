import type { Metadata } from "next";

import { dateParam, DateNav } from "@/components/ui/date-nav";
import { PageHeader } from "@/components/ui/layout";
import { RegisterView } from "@/features/attendance/components/register-view";

export const metadata: Metadata = { title: "Attendance" };

export default async function AdminAttendancePage({ searchParams }: PageProps<"/admin/attendance">) {
  const date = dateParam((await searchParams).date);
  return (
    <>
      <PageHeader title="Attendance register" description="All active students. Therapists can also mark their own students." />
      <DateNav date={date} basePath="/admin/attendance" />
      <RegisterView date={date} />
    </>
  );
}
