import { cn } from "@/lib/utils";

/**
 * Radio buttons styled as a segmented control: large tap targets for tablets/phones.
 * Plain inputs, so it works inside any form without JavaScript.
 */
export function ChoiceGroup({
  name,
  options,
  defaultValue,
  legend,
  size = "md",
}: {
  name: string;
  options: Array<{ value: string; label: string; tone?: "good" | "warn" | "bad" | "neutral" }>;
  defaultValue?: string | null;
  legend: string;
  size?: "sm" | "md";
}) {
  const tone = {
    good: "peer-checked:bg-sage-600 peer-checked:border-sage-600",
    warn: "peer-checked:bg-amber-700 peer-checked:border-amber-700",
    bad: "peer-checked:bg-rose-600 peer-checked:border-rose-600",
    neutral: "peer-checked:bg-ink-600 peer-checked:border-ink-600",
  };
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input type="radio" name={name} value={o.value} defaultChecked={defaultValue === o.value} className="peer sr-only" />
            <span
              className={cn(
                "flex cursor-pointer items-center rounded-lg border border-line bg-white font-bold text-ink-600 select-none peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink-600 hover:bg-ink-50",
                size === "sm" ? "h-9 px-2.5 text-sm" : "h-11 px-3.5 text-[15px]",
                tone[o.tone ?? "neutral"],
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Read-only 1–5 rating shown as filled/empty stars. */
export function RatingStars({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${value} out of 5`} title={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} aria-hidden viewBox="0 0 20 20" className={cn("h-4 w-4", i <= value ? "fill-star-500" : "fill-ink-100")}>
          <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7z" />
        </svg>
      ))}
    </span>
  );
}
