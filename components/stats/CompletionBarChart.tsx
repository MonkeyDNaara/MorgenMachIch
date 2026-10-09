"use client";

import { useEffect, useRef, useState } from "react";
import { APP_LOCALE } from "@/lib/constants/locale";
import type { DayCount } from "@/lib/utils/stats";

const HEIGHT = 150;
const BAR_TOP = 18; // room for value labels
const BASELINE = 116;
const LABEL_Y = 136;
const MIN_BAR = 3;

type CompletionBarChartProps = {
  series: DayCount[];
  /** "day": one bar per day (7/30 days). "week": one bar per week (All). */
  unit: "day" | "week";
};

const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString(APP_LOCALE, options);

function describe(entry: DayCount, unit: "day" | "week"): string {
  const count = `${entry.count} ${entry.count === 1 ? "task" : "tasks"}`;
  return unit === "day"
    ? `${count} · ${fmt(entry.date, { weekday: "short", day: "numeric", month: "short" })}`
    : `${count} · week of ${fmt(entry.date, { day: "numeric", month: "short" })}`;
}

/** Axis label under bar `index`, or null to leave it blank (avoids crowding). */
function axisLabel(series: DayCount[], index: number, unit: "day" | "week"): string | null {
  const entry = series[index];
  const isLast = index === series.length - 1;
  if (unit === "week") {
    const previous = series[index - 1];
    return !previous || previous.date.getMonth() !== entry.date.getMonth()
      ? fmt(entry.date, { month: "short" })
      : null;
  }
  if (series.length <= 7) return isLast ? "Today" : fmt(entry.date, { weekday: "short" });
  // 30 days: every fifth day, counted back from today so today is labelled.
  if ((series.length - 1 - index) % 5 !== 0) return null;
  return isLast ? "Today" : fmt(entry.date, { day: "numeric", month: "short" });
}

/**
 * Bars of completions per day or per week on /stats (#217), hand-built in
 * SVG at the container's measured width (a ResizeObserver keeps it sharp
 * instead of stretching a viewBox). The newest bar — today or this week —
 * is drawn in full cyan. Counts show above the bars when there are few
 * enough to read; otherwise hover or focus a bar for its tooltip. Like the
 * heatmap, the bars are one tab stop with ←/→ to move.
 */
export default function CompletionBarChart({ series, unit }: CompletionBarChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(SVGRectElement | null)[]>([]);
  const [width, setWidth] = useState(0);
  const [focusIndex, setFocusIndex] = useState(series.length - 1);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const last = series.length - 1;
  const active = Math.min(focusIndex, last);
  const max = Math.max(1, ...series.map((entry) => entry.count));
  const slot = series.length > 0 ? width / series.length : 0;
  const barWidth = Math.max(2, Math.min(40, slot * (series.length <= 7 ? 0.62 : 0.7)));
  const showValues = series.length <= 7;
  const barX = (index: number) => index * slot + (slot - barWidth) / 2;
  const barHeight = (count: number) =>
    count === 0 ? 2 : Math.max(MIN_BAR, (count / max) * (BASELINE - BAR_TOP));

  function moveFocus(next: number) {
    const clamped = Math.max(0, Math.min(last, next));
    setFocusIndex(clamped);
    setTooltipIndex(clamped);
    barRefs.current[clamped]?.focus();
  }

  const tooltipEntry = tooltipIndex === null ? null : series[tooltipIndex];

  return (
    <div ref={wrapperRef} className="relative w-full">
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="list" aria-label="Completed tasks per period">
          <line
            x1={0}
            x2={width}
            y1={BASELINE + 0.5}
            y2={BASELINE + 0.5}
            className="stroke-white/10"
            aria-hidden
          />
          {series.map((entry, index) => {
            const height = barHeight(entry.count);
            const x = barX(index);
            const isNewest = index === last;
            const label = axisLabel(series, index, unit);
            return (
              <g key={entry.key}>
                <rect
                  ref={(element) => {
                    barRefs.current[index] = element;
                  }}
                  x={x}
                  y={BASELINE - height}
                  width={barWidth}
                  height={height}
                  rx={Math.min(6, barWidth / 3)}
                  fill={
                    isNewest
                      ? "var(--color-primary)"
                      : entry.count > 0
                        ? "rgba(77, 209, 224, 0.45)"
                        : "var(--color-base-300)"
                  }
                  role="listitem"
                  aria-label={describe(entry, unit)}
                  tabIndex={index === active ? 0 : -1}
                  onKeyDown={(event) => {
                    const moves: Record<string, number> = {
                      ArrowLeft: index - 1,
                      ArrowRight: index + 1,
                      Home: 0,
                      End: last,
                    };
                    if (!(event.key in moves)) return;
                    event.preventDefault();
                    moveFocus(moves[event.key]);
                  }}
                  onFocus={() => {
                    setFocusIndex(index);
                    setTooltipIndex(index);
                  }}
                  onBlur={() => setTooltipIndex(null)}
                  onMouseEnter={() => setTooltipIndex(index)}
                  onMouseLeave={() => setTooltipIndex(null)}
                  className="outline-none focus-visible:stroke-primary focus-visible:stroke-2"
                />
                {showValues && entry.count > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={BASELINE - height - 6}
                    textAnchor="middle"
                    aria-hidden
                    className="fill-base-content/60 font-mono text-[11px]"
                  >
                    {entry.count}
                  </text>
                )}
                {label && (
                  <text
                    x={unit === "week" ? x : x + barWidth / 2}
                    y={LABEL_Y}
                    textAnchor={unit === "week" ? "start" : "middle"}
                    aria-hidden
                    className={`font-mono text-[11px] ${
                      label === "Today" ? "fill-primary" : "fill-base-content/40"
                    }`}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {tooltipEntry && tooltipIndex !== null && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-base-300 px-2 py-1 font-mono text-[11px] whitespace-nowrap shadow-lg shadow-black/40"
          style={{
            left: barX(tooltipIndex) + barWidth / 2,
            top: BASELINE - barHeight(tooltipEntry.count) - (showValues ? 22 : 6),
          }}
        >
          {describe(tooltipEntry, unit)}
        </div>
      )}
    </div>
  );
}
