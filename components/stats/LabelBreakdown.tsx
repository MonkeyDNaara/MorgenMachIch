import type { Label } from "@/lib/types";

/** Color for tasks without a label: the theme's neutral gray-teal. */
const NO_LABEL_COLOR = "var(--color-neutral)";
const MAX_ROWS = 8;

type LabelBreakdownProps = {
  rows: { labelId: string | null; count: number }[];
  labels: Label[];
};

/**
 * Completions per label on /stats (#218): one horizontal bar per label in
 * the label's own color, busiest first, with tasks without a label as
 * "No label". A task with several labels counts for each, so the rows can
 * add up to more than the period's total. Plain HTML bars, since they are
 * just widths — no SVG needed.
 */
export default function LabelBreakdown({ rows, labels }: LabelBreakdownProps) {
  const named = rows
    .map((row) => {
      if (row.labelId === null) return { ...row, name: "No label", color: NO_LABEL_COLOR };
      const label = labels.find((candidate) => candidate.id === row.labelId);
      return label ? { ...row, name: label.name, color: label.color } : null;
    })
    .filter((row) => row !== null);

  if (named.length === 0) {
    return <p className="text-xs text-base-content/40">Nothing completed in this period.</p>;
  }

  const shown = named.slice(0, MAX_ROWS);
  const max = Math.max(...shown.map((row) => row.count));

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {shown.map((row) => (
          <li
            key={row.labelId ?? "none"}
            className="grid grid-cols-[minmax(0,6rem)_1fr_2rem] items-center gap-2 text-xs"
          >
            <span
              className={`truncate ${row.labelId === null ? "text-base-content/50" : ""}`}
              style={row.labelId === null ? undefined : { color: row.color }}
            >
              {row.name}
            </span>
            <span aria-hidden className="h-2 overflow-hidden rounded-full bg-base-300">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(row.count / max) * 100}%`, background: row.color }}
              />
            </span>
            <span className="text-right font-mono text-base-content/50 tabular-nums">
              {row.count}
              <span className="sr-only"> completed</span>
            </span>
          </li>
        ))}
      </ul>
      {named.length > MAX_ROWS && (
        <p className="mt-2 text-xs text-base-content/40">
          + {named.length - MAX_ROWS} more {named.length - MAX_ROWS === 1 ? "label" : "labels"}
        </p>
      )}
    </div>
  );
}
