"use client";

import { useId, useRef, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { setBriefingCollapsed } from "@/features/dashboard/lib/briefingCollapsed";
import { useBriefingSync } from "@/features/dashboard/hooks/useBriefingSync";

export type DashboardWidget = {
  id: string;
  node: ReactNode;
};

type DashboardBandProps = {
  /** The "Important" card: first on every layout. */
  important: ReactNode;
  /** The other cards in desktop order (Yesterday, Body, Training, Learn today, This week). */
  widgets: DashboardWidget[];
  /** Short text for the collapsed line, e.g. "2 important · yesterday 4/6". */
  summary?: ReactNode;
  /** Id of the quick-add input that "Skip to tasks" focuses. */
  quickAddId: string;
  /** Id of the task area, the link's fallback target. */
  tasksId: string;
};

const TOGGLE = "btn btn-ghost btn-xs cursor-pointer gap-1 text-muted";

/**
 * The /today briefing (#421). One DOM order for every layout — the desktop
 * order — so Tab follows what you see on desktop:
 *
 * - md+: a grid band (2 columns, 3 from lg) in its own wider container,
 *   above the task area. "Hide briefing" collapses it to one summary line;
 *   the choice lives on <html data-briefing> (set before paint, see
 *   briefingCollapsed.ts), so CSS — not React state — decides what shows.
 * - below md: the band is `display: contents`, so its cards become items of
 *   TodayView's flex column and `order` puts the task area (order-2) right
 *   after Important (order-1); the other cards follow (order-3).
 *
 * Cards are auto-placed in DOM order, so a missing widget never leaves a gap.
 */
export default function DashboardBand({
  important,
  widgets,
  summary,
  quickAddId,
  tasksId,
}: DashboardBandProps) {
  const bandId = useId();
  const hideRef = useRef<HTMLButtonElement>(null);
  const showRef = useRef<HTMLButtonElement>(null);
  useBriefingSync();

  function collapse() {
    setBriefingCollapsed(true);
    showRef.current?.focus(); // the Hide button just disappeared
  }

  function expand() {
    setBriefingCollapsed(false);
    hideRef.current?.focus();
  }

  return (
    <>
      <a
        href={`#${tasksId}`}
        onClick={(event) => {
          const input = document.getElementById(quickAddId);
          if (!input) return;
          event.preventDefault();
          input.focus();
        }}
        className="sr-only focus:not-sr-only focus:mx-6 focus:mt-4 focus:self-start focus:rounded-field focus:bg-base-300 focus:px-3 focus:py-2 focus:text-sm focus:shadow-focus focus:outline-none md:focus:mx-auto"
      >
        Skip to tasks
      </a>

      <div
        id={bandId}
        className="contents md:mx-auto md:grid md:w-full md:max-w-5xl md:grid-cols-2 md:gap-4 md:px-6 md:pt-6 lg:grid-cols-3 md:briefing-collapsed:hidden"
      >
        <div className="hidden md:col-span-full md:flex md:items-center md:justify-between">
          <p className="font-mono text-eyebrow text-faint uppercase">Briefing</p>
          <button
            ref={hideRef}
            type="button"
            onClick={collapse}
            aria-expanded="true"
            aria-controls={bandId}
            className={TOGGLE}
          >
            <ChevronUp size={14} aria-hidden />
            Hide briefing
          </button>
        </div>
        <div className="order-1 px-6 pt-4 md:px-0 md:pt-0">{important}</div>
        {widgets.map(({ id, node }) => (
          <div key={id} className="order-3 px-6 pb-4 md:px-0 md:pb-0">
            {node}
          </div>
        ))}
      </div>

      <div className="mx-auto hidden w-full max-w-5xl items-center justify-between gap-4 px-6 pt-6 md:briefing-collapsed:flex">
        <p className="min-w-0 truncate font-mono text-eyebrow text-faint uppercase">
          Briefing{summary && <span className="text-muted normal-case"> · {summary}</span>}
        </p>
        <button
          ref={showRef}
          type="button"
          onClick={expand}
          aria-expanded="false"
          aria-controls={bandId}
          className={TOGGLE}
        >
          <ChevronDown size={14} aria-hidden />
          Show briefing
        </button>
      </div>
    </>
  );
}
