import type { ReactNode } from "react";

import { buttonClass } from "./button";

/** A GET form for list filters: values live in the URL, so filtered views can be bookmarked. */
export function FilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-3">
      {children}
      <div className="flex gap-2">
        <button type="submit" className={buttonClass("primary", "md")}>
          Apply
        </button>
        <a href={resetHref} className={buttonClass("ghost", "md")}>
          Clear
        </a>
      </div>
    </form>
  );
}

const control = "h-11 rounded-lg border border-line bg-white px-3 text-[15px]";

export function FilterField({ label, children, grow }: { label: string; children: ReactNode; grow?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-bold text-ink-700 ${grow ? "min-w-48 flex-1" : ""}`}>
      {label}
      {children}
    </label>
  );
}

export function FilterInput(props: React.ComponentProps<"input">) {
  return <input className={`${control} font-normal`} {...props} />;
}

export function FilterSelect(props: React.ComponentProps<"select">) {
  return <select className={`${control} font-normal`} {...props} />;
}

/** Reads a single string search param. */
export function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
