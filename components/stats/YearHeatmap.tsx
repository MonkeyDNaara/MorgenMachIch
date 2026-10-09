"use client";

import { useEffect, useRef, useState } from "react";
import { APP_LOCALE } from "@/lib/constants/locale";
import type { Heatmap, HeatmapCell } from "@/lib/utils/stats";

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 28; // room for the weekday labels
const TOP = 16; // room for the month labels
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/** Level 0 is the empty-cell gray; 1–4 are increasing shares of the cyan accent. */
const LEVEL_FILLS = [
  "var(--color-base-300)",
  "rgba(77, 209, 224, 0.28)",
  "rgba(77, 209, 224, 0.5)",
  "rgba(77, 209, 224, 0.75)",
  "var(--color-primary)",
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

  // Start at the newest week when the grid is wider than the card.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, []);

  const width = LEFT + heatmap.weeks.length * STEP;
  const height = TOP + 7 * STEP;
  const position = (index: number) => ({
    x: LEFT + Math.floor(index / 7) * STEP,
    y: TOP + (index % 7) * STEP,
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
              x={LEFT + month.weekIndex * STEP}
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
                y={TOP + row * STEP + 9}
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
                width={CELL}
                height={CELL}
                rx={3}
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
                className="outline-none focus-visible:stroke-primary focus-visible:stroke-2"
              />
            );
          })}
        </svg>
      </div>

      {tooltipCell && tooltipPos && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-base-300 px-2 py-1 font-mono text-[11px] whitespace-nowrap shadow-lg shadow-black/40"
          style={{ left: tooltipPos.x - scrollLeft + CELL / 2, top: tooltipPos.y - 6 }}
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
