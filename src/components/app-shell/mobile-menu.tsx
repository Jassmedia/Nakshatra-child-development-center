"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

/** Phone/tablet menu: a button that opens the same navigation the desktop sidebar shows. */
export function MobileMenu({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Remember the page the menu was opened on; navigating elsewhere closes it automatically.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const toggle = () => setOpenOn(open ? null : pathname);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-white hover:bg-ink-700"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
          {open ? (
            <path d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" />
          ) : (
            <path d="M3 5h14a1 1 0 100-2H3a1 1 0 000 2zm14 4H3a1 1 0 000 2h14a1 1 0 100-2zm0 6H3a1 1 0 000 2h14a1 1 0 100-2z" />
          )}
        </svg>
        Menu
      </button>
      {open ? (
        <div id="mobile-nav" className="absolute inset-x-0 top-full z-40 border-t border-ink-700 bg-ink-800 px-3 pt-2 pb-4 shadow-lg">
          {children}
        </div>
      ) : null}
    </>
  );
}
