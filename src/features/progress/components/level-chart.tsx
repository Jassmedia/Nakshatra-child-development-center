import { LEVEL_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

/**
 * Small line chart of one area's level (1-5) over time. One series, so no legend:
 * the panel title names it. Points carry native tooltips; the update list below is the table view.
 */
export function LevelChart({ points, label }: { points: Array<{ date: string; level: number }>; label: string }) {
  const W = 320;
  const H = 120;
  const pad = { l: 22, r: 10, t: 10, b: 20 };
  if (points.length === 0) return <p className="text-sm text-ink-400">No levels recorded yet.</p>;

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const t = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
  const t0 = t(sorted[0].date);
  const t1 = t(sorted[sorted.length - 1].date);
  const x = (d: string) => (t1 === t0 ? (pad.l + W - pad.r) / 2 : pad.l + ((t(d) - t0) / (t1 - t0)) * (W - pad.l - pad.r));
  const y = (lvl: number) => pad.t + ((5 - lvl) / 4) * (H - pad.t - pad.b);
  const path = sorted.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.level).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: level over time, latest ${sorted[sorted.length - 1].level} of 5`}>
      {[1, 2, 3, 4, 5].map((lvl) => (
        <g key={lvl}>
          <line x1={pad.l} x2={W - pad.r} y1={y(lvl)} y2={y(lvl)} stroke="var(--color-ink-50)" strokeWidth={1} />
          <text x={pad.l - 8} y={y(lvl) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-300)">{lvl}</text>
        </g>
      ))}
      <text x={pad.l} y={H - 4} fontSize="10" fill="var(--color-ink-300)">{formatDate(sorted[0].date)}</text>
      {sorted.length > 1 ? (
        <text x={W - pad.r} y={H - 4} fontSize="10" textAnchor="end" fill="var(--color-ink-300)">{formatDate(sorted[sorted.length - 1].date)}</text>
      ) : null}
      <path d={path} fill="none" stroke="var(--color-ink-600)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {sorted.map((p, i) => (
        <g key={`${p.date}-${i}`}>
          <circle cx={x(p.date)} cy={y(p.level)} r={4} fill="var(--color-ink-600)" stroke="white" strokeWidth={2} />
          {/* Larger invisible hit target with a tooltip. */}
          <circle cx={x(p.date)} cy={y(p.level)} r={11} fill="transparent">
            <title>{`${formatDate(p.date)}: level ${p.level} (${LEVEL_LABEL[p.level]})`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
