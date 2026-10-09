"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { TrendingUp } from "lucide-react";
import { getTasks } from "@/lib/db/tasks";
import { getSettings } from "@/lib/db/settings";
import { applyStatsStart, completionsByDay, streakSummary } from "@/lib/utils/stats";

/**
 * Small streak pill in the /today header (#219), linking to /stats.
 * Three states from streakSummary: an active streak (something done
 * today), a streak at risk (alive only thanks to yesterday — dashed, with
 * a nudge), and no streak. A live query keeps it current when a task is
 * ticked off on the same page. Renders nothing while loading so the
 * header doesn't flash a wrong state.
 */
export default function StreakBadge() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  if (tasks === undefined || settings === undefined) return null;

  // Same stats start date as /stats (#226).
  const counted = applyStatsStart(tasks, settings.statsSince);
  const streak = streakSummary(completionsByDay(counted), new Date());
  const days = `${streak.current}-day streak`;

  const { text, label, className } = streak.atRisk
    ? {
        text: (
          <>
            {days}
            <span className="text-base-content/50"> · do one today</span>
          </>
        ),
        label: `${days} — complete a task today to keep it. Open stats`,
        className: "border-dashed border-accent/60 text-accent",
      }
    : streak.current > 0
      ? {
          text: days,
          label: `${days}. Open stats`,
          className: "border-accent/40 bg-accent/10 text-accent",
        }
      : {
          text: "Start a streak",
          label: "No streak yet — complete a task to start one. Open stats",
          className: "border-base-300 text-base-content/50 hover:text-base-content",
        };

  return (
    <Link
      href="/stats"
      aria-label={label}
      title="Open stats"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap outline-none! transition-colors focus-visible:shadow-focus ${className}`}
    >
      <TrendingUp size={13} strokeWidth={2} aria-hidden />
      {text}
    </Link>
  );
}
