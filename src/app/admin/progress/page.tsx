import type { Metadata } from "next";
import Link from "next/link";

import { FilterBar, FilterField, FilterSelect, param } from "@/components/ui/filters";
import { Badge, EmptyState, PageHeader, Panel, StatusBadge, Table, Td, Th } from "@/components/ui/layout";
import { latestByArea, listRecentProgress } from "@/features/progress/queries";
import { DEVELOPMENT_AREAS, TREND_LABEL, TRENDS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

export default async function AdminProgressPage({ searchParams }: PageProps<"/admin/progress">) {
  const sp = await searchParams;
  const trend = param(sp.trend);
  const area = param(sp.area);
  const rows = await listRecentProgress({
    trend: (TRENDS as readonly string[]).includes(trend) ? trend : undefined,
    area: area || undefined,
  });
  // Areas whose LATEST update says "needs attention", per child.
  const all = await listRecentProgress();
  const attention = [...new Map(all.map((r) => [r.student_id, null])).keys()].flatMap((sid) =>
    latestByArea(all.filter((r) => r.student_id === sid)).filter((r) => r.trend === "needs_attention"),
  );

  return (
    <>
      <PageHeader title="Progress" description="Latest progress updates across all children." />
      <Panel title="Currently needing attention" className="mb-6">
        {attention.length === 0 ? (
          <p className="text-sm text-ink-400">No area is currently marked as needing attention.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attention.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-2">
                <Link href={`/admin/students/${r.student_id}/progress?area=${encodeURIComponent(r.area)}`} className="font-bold text-ink-600 hover:underline">
                  {r.student?.full_name}
                </Link>
                <span>{r.area}</span>
                <span className="text-sm text-ink-400">since {formatDate(r.record_date)}</span>
                {r.attention_areas ? <span className="w-full text-sm text-ink-500 sm:w-auto">{r.attention_areas}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <FilterBar resetHref="/admin/progress">
        <FilterField label="Area">
          <FilterSelect name="area" defaultValue={area}>
            <option value="">All areas</option>
            {DEVELOPMENT_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </FilterSelect>
        </FilterField>
        <FilterField label="Trend">
          <FilterSelect name="trend" defaultValue={trend}>
            <option value="">Any</option>
            {TRENDS.map((t) => <option key={t} value={t}>{TREND_LABEL[t]}</option>)}
          </FilterSelect>
        </FilterField>
      </FilterBar>
      <Panel padded={false}>
        {rows.length === 0 ? (
          <div className="p-4"><EmptyState title="No progress updates match" /></div>
        ) : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Child</Th><Th>Area</Th><Th>Level</Th><Th>Trend</Th><Th>By</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>{formatDate(r.record_date)}</Td>
                  <Td><Link href={`/admin/students/${r.student_id}/progress`} className="font-bold text-ink-600 hover:underline">{r.student?.full_name}</Link></Td>
                  <Td>{r.area}{!r.shared_with_parent ? <span className="ml-2"><Badge tone="warn">Internal</Badge></span> : null}</Td>
                  <Td>{r.level ?? "—"}</Td>
                  <Td><StatusBadge status={r.trend} label={TREND_LABEL[r.trend]} /></Td>
                  <Td>{r.author_name ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
