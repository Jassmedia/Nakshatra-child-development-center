import Link from "next/link";
import type { ReactNode } from "react";

import { StarMark } from "@/components/ui/star-mark";
import { signOut } from "@/features/auth/actions";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";
import { NAV } from "@/lib/navigation";

import { MobileMenu } from "./mobile-menu";
import { NotificationBell } from "./notification-bell";
import { NavLinks } from "./nav-links";

function UserBlock({ user }: { user: CurrentUser }) {
  return (
    <div className="flex flex-col gap-1 border-t border-ink-700 pt-3">
      <Link href="/account" className="rounded-lg px-3 py-2 hover:bg-ink-700/60">
        <span className="block truncate text-[15px] font-bold text-white">{user.fullName || user.email}</span>
        <span className="block text-xs text-ink-300">{ROLE_LABEL[user.role]}</span>
      </Link>
      <form action={signOut}>
        <button type="submit" className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] text-ink-200 hover:bg-ink-700/60 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
}

/** Logged-in frame shared by the admin, staff and parent areas. */
export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const items = NAV[user.role];
  const brand = (
    <Link href={ROLE_HOME[user.role]} className="flex items-center gap-2.5">
      <StarMark className="h-8 w-8" />
      <span className="leading-tight">
        <span className="block text-[15px] font-bold text-white">Nakshatra</span>
        <span className="block text-xs text-ink-300">Child Development Center</span>
      </span>
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-ink-800 px-3 py-5 lg:flex">
        <div className="px-2">{brand}</div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto">
          <NavLinks items={items} />
        </nav>
        <UserBlock user={user} />
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink-800 px-3 lg:hidden">
        {brand}
        <div className="flex items-center gap-1">
          <NotificationBell />
          <MobileMenu>
            <nav aria-label="Main">
              <NavLinks items={items} />
            </nav>
            <div className="mt-3">
              <UserBlock user={user} />
            </div>
          </MobileMenu>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden h-14 items-center justify-end border-b border-line bg-white px-6 lg:flex">
          <NotificationBell tone="light" />
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
