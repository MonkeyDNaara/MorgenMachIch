"use client";

import { useEffect, useRef, useState } from "react";
import { APP_LOCALE } from "@/lib/constants/locale";
import type { Heatmap, HeatmapCell } from "@/lib/utils/stats";

const GAP = 3;
/** Cell + gap per week column: grows to fill the card (#242), never below MIN_STEP. */
const MIN_STEP = 14;
const MAX_STEP = 22;
const LEFT = 28; // room for the weekday labels
const TOP = 16; // room for the month labels
const RIGHT = 16; // room so the last month label is never clipped
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/** Level 0 is the empty-cell gray; 1–4 are the theme's data levels (shares of the accent). */
const LEVEL_FILLS = [
  "var(--color-base-300)",
  "var(--mm-data-1)",
  "var(--mm-data-2)",
  "var(--mm-data-3)",
  "var(--mm-data-4)",
];

function describe(cell: HeatmapCell): string {
  const day = cell.date.toLocaleDateString(APP_LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${cell.count} ${cell.count === 1 ? "task" : "tasks"} · ${day}`;
}

/**
 * GitHub-style year grid on /stats (#216), hand-built in SVG. Columns are
 * weeks (oldest left), rows Monday → Sunday; days after today are left
 * out. On narrow screens it scrolls horizontally and starts at the newest
 * week.
 *
 * Keyboard: the grid is a single tab stop ("roving tabindex"); arrow keys
 * move a day or a week, Home/End jump to the first/last day. Hovering or
 * focusing a cell shows a small tooltip with the count and date.
 */
export default function YearHeatmap({ heatmap }: { heatmap: Heatmap }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(SVGRectElement | null)[]>([]);
  const cells = heatmap.weeks.flat().filter((cell) => !cell.future);
  const todayIndex = cells.length - 1;
  const [focusIndex, setFocusIndex] = useState(todayIndex);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [available, setAvailable] = useState(0);

  // Size the cells to the card's width (same ResizeObserver idea as the
  // bar chart); on narrow screens they stay at MIN_STEP and the grid scrolls.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  // Start at the newest week when the grid is wider than the card.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, []);

  const weekCount = heatmap.weeks.length;
  const step = Math.max(
    MIN_STEP,
    Math.min(MAX_STEP, Math.floor((available - LEFT - RIGHT) / Math.max(1, weekCount))),
  );
  const cellSize = step - GAP;
  const width = LEFT + weekCount * step + RIGHT;
  const height = TOP + 7 * step;
  const position = (index: number) => ({
    x: LEFT + Math.floor(index / 7) * step,
    y: TOP + (index % 7) * step,
  });
  const busiest = cells.reduce<HeatmapCell | null>(
    (best, cell) => (cell.count > (best?.count ?? 0) ? cell : best),
    null,
  );

  function moveFocus(next: number) {
    const clamped = Math.max(0, Math.min(todayIndex, next));
    setFocusIndex(clamped);
    setTooltipIndex(clamped);
    cellRefs.current[clamped]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGRectElement>) {
    const moves: Record<string, number> = {
      ArrowUp: focusIndex - 1,
      ArrowDown: focusIndex + 1,
      ArrowLeft: focusIndex - 7,
      ArrowRight: focusIndex + 7,
      Home: 0,
      End: todayIndex,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    moveFocus(moves[event.key]);
  }

  const tooltipCell = tooltipIndex === null ? null : cells[tooltipIndex];
  const tooltipPos = tooltipIndex === null ? null : position(tooltipIndex);

  return (
    <div className="relative">
      <p className="sr-only">
        {heatmap.total} tasks completed in the last 12 months.
        {busiest && ` Busiest day: ${describe(busiest)}.`} Use the arrow keys to move between days.
      </p>
      <div
        ref={scrollRef}
        onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
        className="overflow-x-auto pb-1"
      >
        <svg
          width={width}
          height={height}
          role="grid"
          aria-label="Completed tasks per day, last 12 months"
        >
          {heatmap.months.map((month) => (
            <text
              key={`${month.weekIndex}-${month.label}`}
              x={LEFT + month.weekIndex * step}
              y={10}
              aria-hidden
              className="fill-base-content/40 font-mono text-[10px]"
            >
              {month.label}
            </text>
          ))}
          {WEEKDAY_LABELS.map((label, row) =>
            label ? (
              <text
                key={label}
                x={0}
                y={TOP + row * step + cellSize / 2 + 3}
                aria-hidden
                className="fill-base-content/40 font-mono text-[9px]"
              >
                {label}
              </text>
            ) : null,
          )}
          {cells.map((cell, index) => {
            const { x, y } = position(index);
            const isToday = index === todayIndex;
            return (
              <rect
                key={cell.key}
                ref={(element) => {
                  cellRefs.current[index] = element;
                }}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={Math.round(cellSize / 4)}
                fill={LEVEL_FILLS[cell.level]}
                stroke={isToday ? "var(--color-base-content)" : undefined}
                strokeOpacity={isToday ? 0.7 : undefined}
                strokeWidth={isToday ? 1.2 : undefined}
                role="gridcell"
                aria-label={describe(cell)}
                tabIndex={index === focusIndex ? 0 : -1}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setFocusIndex(index);
                  setTooltipIndex(index);
                }}
                onBlur={() => setTooltipIndex(null)}
                onMouseEnter={() => setTooltipIndex(index)}
                onMouseLeave={() => setTooltipIndex(null)}
                className="outline-none focus-visible:stroke-accent focus-visible:stroke-2"
              />
            );
          })}
        </svg>
      </div>

      {tooltipCell && tooltipPos && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line-strong bg-base-300 px-2 py-1 font-mono text-[11px] whitespace-nowrap shadow-overlay"
          style={{ left: tooltipPos.x - scrollLeft + cellSize / 2, top: tooltipPos.y - 6 }}
        >
          {describe(tooltipCell)}
        </div>
      )}

      <div
        aria-hidden
        className="mt-2 flex items-center justify-end gap-1 font-mono text-[10px] text-base-content/40"
      >
        Less
        {LEVEL_FILLS.map((fill) => (
          <span key={fill} className="size-[11px] rounded-[3px]" style={{ background: fill }} />
        ))}
        More
      </div>
    </div>
  );
}
