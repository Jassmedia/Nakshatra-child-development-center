import type { Metadata } from "next";

import { dateParam, DateNav } from "@/components/ui/date-nav";
import { PageHeader } from "@/components/ui/layout";
import { RegisterView } from "@/features/attendance/components/register-view";

export const metadata: Metadata = { title: "Attendance" };

export default async function StaffAttendancePage({ searchParams }: PageProps<"/staff/attendance">) {
  const date = dateParam((await searchParams).date);
  return (
    <>
      <PageHeader title="Attendance" description="Your students. Saving again corrects an entry; the change is kept in the history." />
      <DateNav date={date} basePath="/staff/attendance" />
      <RegisterView date={date} />
    </>
  );
}
