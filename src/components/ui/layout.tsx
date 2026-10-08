import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink-800 sm:text-[28px]">{title}</h1>
          {description ? <div className="mt-1 max-w-prose text-[15px] text-ink-400">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-white", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          {title ? <h2 className="text-base font-bold text-ink-800">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className={padded ? "p-4" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center">
      <p className="font-bold text-ink-700">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-prose text-sm text-ink-400">{children}</div> : null}
    </div>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-50 text-ink-600",
  good: "bg-sage-50 text-sage-800",
  warn: "bg-amber-50 text-amber-700",
  bad: "bg-rose-50 text-rose-800",
  info: "bg-ink-100 text-ink-700",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

/** Maps every status value used in the app to a badge colour. */
const STATUS_TONE: Record<string, Tone> = {
  active: "good",
  on_hold: "warn",
  discharged: "neutral",
  present: "good",
  late: "warn",
  absent: "bad",
  leave: "neutral",
  scheduled: "info",
  completed: "good",
  partially_completed: "warn",
  not_completed: "bad",
  cancelled: "neutral",
  pending: "warn",
  reviewed: "good",
  paid: "good",
  partially_paid: "warn",
  overdue: "bad",
  improving: "good",
  steady: "info",
  needs_attention: "bad",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{text}</Badge>;
}

/** A table that scrolls sideways inside its panel on small screens (the page never does). */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-px overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-line bg-ink-50/60 px-3 py-2.5 text-xs font-bold text-ink-500", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-3 py-3 align-top", className)}>{children}</td>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-ink-400">{label}</p>
      <p
        className={cn(
          "mt-1 text-[28px] leading-none font-bold tabular-nums",
          tone === "bad" ? "text-rose-800" : tone === "warn" ? "text-amber-700" : tone === "good" ? "text-sage-800" : "text-ink-800",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

/** A definition list for profile-style details. */
export function Details({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-bold text-ink-400">{label}</dt>
          <dd className="mt-0.5 break-words text-[15px] text-ink-800">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
