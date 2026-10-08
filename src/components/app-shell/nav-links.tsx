"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** The home item ("/admin") is active only on itself; others also on their sub-pages. */
function isActive(pathname: string, href: string, isHome: boolean) {
  return isHome ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, index) => {
        const active = isActive(pathname, item.href, index === 0);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center rounded-lg px-3 text-[15px] transition-colors",
                active ? "bg-ink-700 font-bold text-white" : "text-ink-200 hover:bg-ink-700/60 hover:text-white",
              )}
            >
              {active ? (
                <span aria-hidden className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-star-500" />
              ) : null}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
