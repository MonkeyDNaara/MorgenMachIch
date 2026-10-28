import { barLevels, type BarLevel } from "@/lib/charts/barLevels";

type MiniBarsProps = {
  /** One slot per bar; `null` = a slot still to come (e.g. later this week). */
  values: readonly (number | null)[];
  /** Accessible name that sums up the data, e.g. "Done per day: Mon 3, Tue 0, …". */
  label: string;
  /** Slot drawn in the full accent color, e.g. today. */
  highlightIndex?: number;
  /** Fixed top of the scale instead of the largest value. */
  max?: number;
  /** Height in px; bars share the width. */
  height?: number;
};

function barClass(level: BarLevel, highlighted: boolean): string {
  if (level.kind === "future") return "h-full bg-track opacity-50";
  if (level.kind === "empty") return "h-[3px] bg-track";
  return highlighted ? "bg-data-4" : "bg-data-2";
}

/**
 * A row of small bars (#422), e.g. tasks done per day this week. Plain
 * flex bars, so they follow the card's width and stay crisp: a value bar
 * (`data-2`, the highlighted one `data-4`), a short track stub for 0 and a
 * faint full-height track for future slots. Static: one accessible name.
 */
export default function MiniBars({
  values,
  label,
  highlightIndex,
  max,
  height = 40,
}: MiniBarsProps) {
  return (
    <div role="img" aria-label={label} className="flex items-end gap-1" style={{ height }}>
      {barLevels(values, max).map((level, index) => (
        <span
          key={index}
          aria-hidden
          data-kind={level.kind}
          className={`min-w-0 flex-1 rounded-[3px] ${barClass(level, index === highlightIndex)}`}
          style={level.kind === "value" ? { height: `max(3px, ${level.ratio * 100}%)` } : undefined}
        />
      ))}
    </div>
  );
}
