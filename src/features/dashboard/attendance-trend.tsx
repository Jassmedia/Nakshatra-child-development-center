import { formatDate } from "@/lib/utils";

/**
 * Attendance rate per day, last 14 days. One series: bars from a zero baseline,
 * rounded data ends, recessive 50%/100% guides, native tooltips; empty days are gaps.
 */
export function AttendanceTrend({ points }: { points: Array<{ date: string; rate: number | null; marked: number }> }) {
  const W = 560;
  const H = 150;
  const pad = { l: 30, r: 6, t: 8, b: 22 };
  const slot = (W - pad.l - pad.r) / points.length;
  const bar = Math.min(22, slot - 4);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const withData = points.filter((p) => p.rate !== null);
  if (withData.length === 0) return <p className="text-sm text-ink-400">No attendance marked in the last 14 days.</p>;
  const avg = Math.round(withData.reduce((s, p) => s + (p.rate ?? 0), 0) / withData.length);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Daily attendance rate, last 14 days. Average ${avg}%.`}>
        {[50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-ink-50)" />
            <text x={pad.l - 6} y={y(v) + 3.5} fontSize="10" textAnchor="end" fill="var(--color-ink-300)">{v}%</text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="var(--color-ink-100)" />
        {points.map((p, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const label = new Date(`${p.date}T00:00:00Z`).getUTCDate();
          return (
            <g key={p.date}>
              {p.rate !== null ? (
                <path
                  d={(() => {
                    const x0 = cx - bar / 2;
                    const top = y(p.rate);
                    const h = y(0) - top;
                    const r = Math.min(4, h);
                    return `M${x0},${y(0)} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bar - r} Q${x0 + bar},${top} ${x0 + bar},${top + r} V${y(0)} Z`;
                  })()}
                  fill="var(--color-ink-600)"
                />
              ) : null}
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent">
                <title>{p.rate === null ? `${formatDate(p.date)}: not marked` : `${formatDate(p.date)}: ${p.rate}% attended (${p.marked} marked)`}</title>
              </rect>
              <text x={cx} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--color-ink-300)">{label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-ink-400">Average {avg}% on days with attendance marked. Leave is not counted.</figcaption>
    </figure>
  );
}
