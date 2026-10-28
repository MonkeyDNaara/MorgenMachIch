import {
  chartRange,
  lineSegments,
  scalePoints,
  scaleY,
  segmentPath,
  type ChartPoint,
} from "@/lib/charts/scalePoints";

/** viewBox units on both axes; the SVG is stretched to the container. */
const VIEW = 100;
/** Vertical room so the stroke and the dot aren't clipped at the edges. */
const INSET = 8;

type SparklineProps = {
  values: readonly (number | null)[];
  /** Accessible name that sums up the data, e.g. "Steps, last 7 days: 6,200 to 9,800". */
  label: string;
  /** Dot on the newest value (default on). */
  lastDot?: boolean;
  /** Dashed horizontal line, e.g. a daily step goal; always inside the drawn range. */
  goal?: number;
  min?: number;
  max?: number;
  /** Height in px; the width follows the container. */
  height?: number;
};

/**
 * Small trend line (#422), hand-built SVG like the stats charts. The SVG is
 * stretched (`preserveAspectRatio="none"`) so it fills any card without
 * measuring; `non-scaling-stroke` keeps the line width even. The last-point
 * dot is an HTML element positioned in %, so it stays round. `null` values
 * break the line. Static: one accessible name, no tab stops.
 */
export default function Sparkline({
  values,
  label,
  lastDot = true,
  goal,
  min,
  max,
  height = 40,
}: SparklineProps) {
  const range = chartRange(goal === undefined ? values : [...values, goal], { min, max });
  const inner = VIEW - 2 * INSET;
  const points: (ChartPoint | null)[] = range
    ? scalePoints(values, VIEW, inner, range).map((point) =>
        point ? { x: point.x, y: point.y + INSET } : null,
      )
    : values.map(() => null);
  const segments = lineSegments(points);
  const last = lastDot ? points.findLast((point) => point !== null) : undefined;
  const goalY = range && goal !== undefined ? scaleY(goal, range, inner) + INSET : null;

  return (
    <div role="img" aria-label={label} className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="none"
        aria-hidden
        className="block size-full overflow-visible"
      >
        {goalY !== null && (
          <line
            data-goal
            x1={0}
            x2={VIEW}
            y1={goalY}
            y2={goalY}
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
            className="stroke-faint"
          />
        )}
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segmentPath(segment)}
            fill="none"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-accent"
          />
        ))}
      </svg>
      {last && (
        <span
          data-last-dot
          aria-hidden
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-base-200"
          style={{ left: `${last.x}%`, top: `${last.y}%` }}
        />
      )}
    </div>
  );
}
