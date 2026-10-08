import type { Metadata } from "next";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { markAllRead } from "@/features/notifications/actions";
import { listNotifications } from "@/features/notifications/queries";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_LABEL: Record<string, string> = {
  activity: "Activity",
  assignment: "Home task",
  progress: "Progress",
  attendance: "Attendance",
  payment: "Payment",
  reminder: "Reminder",
  general: "Notice",
};

export default async function NotificationsPage() {
  const items = await listNotifications();
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={unread ? (
          <ActionForm action={markAllRead}>
            <SubmitButton variant="secondary">Mark all as read</SubmitButton>
          </ActionForm>
        ) : null}
      />
      {items.length === 0 ? (
        <EmptyState title="No notifications yet">Updates about activities, attendance, progress, home tasks and payments will appear here.</EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {items.map((n) => (
            <li key={n.id}>
              {/* Plain <a>, not <Link>: Link prefetching would call this "mark as read" address just by showing it. */}
              <a href={`/notifications/open/${n.id}`} className={cn("flex gap-3 px-4 py-3 hover:bg-ink-50", !n.read_at && "bg-star-300/15")}>
                <span aria-hidden className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-star-500")} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={cn("text-[15px]", !n.read_at && "font-bold")}>{n.title}</span>
                    <span className="text-xs text-ink-400">{TYPE_LABEL[n.type]}, {formatDateTime(n.created_at)}</span>
                  </span>
                  {n.body ? <span className="mt-0.5 line-clamp-2 block text-sm text-ink-500">{n.body}</span> : null}
                  {!n.read_at ? <span className="sr-only">Unread</span> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
