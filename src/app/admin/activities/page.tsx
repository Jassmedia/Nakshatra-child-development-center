import type { Metadata } from "next";

import { LinkButton } from "@/components/ui/button";
import { dateParam, DateNav } from "@/components/ui/date-nav";
import { param } from "@/components/ui/filters";
import { PageHeader } from "@/components/ui/layout";
import { DailyActivitiesView } from "@/features/activities/components/daily-activities-view";
import { ACTIVITY_STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "Daily activities" };

export default async function AdminActivitiesPage({ searchParams }: PageProps<"/admin/activities">) {
  const sp = await searchParams;
  const date = dateParam(sp.date);
  const status = param(sp.status);
  return (
    <>
      <PageHeader
        title="Daily activities"
        description="Every child's activities and workouts for the day."
        actions={<LinkButton href="/admin/activities/catalogue" variant="secondary">Activity list</LinkButton>}
      />
      <DateNav date={date} basePath="/admin/activities" />
      <DailyActivitiesView date={date} canEdit status={(ACTIVITY_STATUSES as readonly string[]).includes(status) ? status : undefined} />
    </>
  );
}
