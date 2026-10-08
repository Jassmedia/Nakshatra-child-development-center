import Link from "next/link";

import { unreadCount } from "@/features/notifications/queries";

/** Bell with unread count. Rendered on the server for each page. */
export async function NotificationBell({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const count = await unreadCount();
  const label = count ? `Notifications, ${count} unread` : "Notifications";
  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={label}
      className={`relative flex h-11 w-11 items-center justify-center rounded-lg ${tone === "dark" ? "text-white hover:bg-ink-700" : "text-ink-600 hover:bg-ink-50"}`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count ? (
        <span className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-star-500 px-1 text-[11px] leading-5 font-bold text-ink-900">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
