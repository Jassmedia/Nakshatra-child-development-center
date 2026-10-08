import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/ui/filters";
import { EmptyState, Panel, Table, Td, Th } from "@/components/ui/layout";
import { cn, formatDate } from "@/lib/utils";

import { REPORTS, type ReportKey } from "./definitions";
import { runReport, type ReportFilters } from "./queries";

const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function show(v: unknown, key: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (isDate(v)) return formatDate(v as string);
  if (typeof v === "number") return key === "rate" ? `${v}%` : v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return String(v);
}

export async function ReportView({
  basePath,
  report,
  filters,
  allowed,
  students,
}: {
  basePath: string;
  report: ReportKey;
  filters: ReportFilters;
  allowed: ReportKey[];
  students: Array<{ id: string; full_name: string }>;
}) {
  const result = await runReport(report, filters);
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ report, from: filters.from, to: filters.to, ...(filters.studentId ? { student: filters.studentId } : {}), ...extra }).toString();

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Reports" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {allowed.map((k) => (
            <li key={k}>
              <Link
                href={`${basePath}?${qs({ report: k })}`}
                aria-current={k === report ? "page" : undefined}
                className={cn("block rounded-full border px-3.5 py-2 text-sm font-bold whitespace-nowrap", k === report ? "border-ink-600 bg-ink-600 text-white" : "border-line bg-white text-ink-600 hover:bg-ink-50")}
              >
                {REPORTS[k].label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <FilterBar resetHref={`${basePath}?report=${report}`}>
        <input type="hidden" name="report" value={report} />
        <FilterField label="Student">
          <FilterSelect name="student" defaultValue={filters.studentId ?? ""}>
            <option value="">All students</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </FilterSelect>
        </FilterField>
        <FilterField label="From"><FilterInput type="date" name="from" defaultValue={filters.from} /></FilterField>
        <FilterField label="To"><FilterInput type="date" name="to" defaultValue={filters.to} /></FilterField>
      </FilterBar>

      <Panel
        title={REPORTS[report].label}
        padded={false}
        actions={
          <a href={`${basePath}/export?${qs({})}`} className={buttonClass("secondary", "sm")} download>
            Download CSV
          </a>
        }
      >
        <p className="border-b border-line px-4 py-2 text-sm text-ink-400">
          {REPORTS[report].description} {formatDate(filters.from)} to {formatDate(filters.to)}.
          {result.note ? ` ${result.note}` : ""}
        </p>
        {result.rows.length === 0 ? (
          <div className="p-4"><EmptyState title="No data for these filters" /></div>
        ) : (
          <Table>
            <thead>
              <tr>{result.columns.map((c) => <Th key={c.key} className={c.align === "right" ? "text-right" : undefined}>{c.label}</Th>)}</tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i}>
                  {result.columns.map((c) => (
                    <Td key={c.key} className={cn(c.align === "right" && "text-right tabular-nums", (c.key === "observations" || c.key === "attention") && "max-w-xs")}>
                      {show(row[c.key], c.key)}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
            {result.totals ? (
              <tfoot>
                <tr className="bg-ink-50/60 font-bold">
                  {result.columns.map((c) => (
                    <Td key={c.key} className={cn(c.align === "right" && "text-right tabular-nums")}>
                      {result.totals?.[c.key] === undefined ? "" : show(result.totals[c.key], c.key)}
                    </Td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </Table>
        )}
      </Panel>
    </div>
  );
}
