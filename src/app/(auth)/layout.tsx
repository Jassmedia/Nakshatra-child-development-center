import { StarMark } from "@/components/ui/star-mark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-ink-800 p-12 text-ink-100 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <StarMark className="h-9 w-9" />
          <span className="text-lg font-bold text-white">Nakshatra</span>
        </div>
        <div className="max-w-md">
          <p className="text-[34px] leading-tight font-bold text-white">
            Every session, every small step, kept in one place.
          </p>
          <p className="mt-4 text-[17px] leading-7 text-ink-200">
            Therapists record the day. Parents see how their child is doing, practise at home, and stay in
            touch with the center.
          </p>
        </div>
        <p className="text-sm text-ink-300">Nakshatra Child Development Center</p>
        {/* Quiet constellation in the corner */}
        <svg aria-hidden className="pointer-events-none absolute -right-10 top-24 h-72 w-72 opacity-40" viewBox="0 0 200 200">
          <g stroke="var(--color-ink-400)" strokeWidth="1" fill="none">
            <path d="M30 150 L80 110 L120 125 L165 60 L140 30" />
            <path d="M80 110 L95 60" />
          </g>
          {[
            [30, 150],
            [80, 110],
            [120, 125],
            [165, 60],
            [140, 30],
            [95, 60],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={x === 165 ? 4 : 2.5} fill="var(--color-star-300)" />
          ))}
        </svg>
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <StarMark className="h-9 w-9" />
            <span className="text-lg font-bold">Nakshatra CDC</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
