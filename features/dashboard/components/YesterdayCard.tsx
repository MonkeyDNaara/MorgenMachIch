"use client";

import { History } from "lucide-react";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import EmptyState from "@/components/ui/EmptyState";
import PriorityDot from "@/features/tasks/components/card/PriorityDot";
import { useTaskDrawer } from "@/features/tasks/components/drawer/TaskDrawerProvider";
import type { YesterdayReview } from "@/features/dashboard/lib/yesterdayReview";
import { APP_LOCALE } from "@/lib/constants/locale";

/** How many left-over tasks are listed before "+ n more". */
const MAX_LISTED = 3;

type YesterdayCardProps = {
  /** undefined while tasks are still loading. */
  review: YesterdayReview | undefined;
  /** Short written review from the Improvement Agent (#427); plain text for now. */
  note?: string;
};

/**
 * Dashboard card "Yesterday" (#423): done / due for the previous local day
 * with a thin progress bar, and the tasks that were left open — each one
 * opens the task drawer. They also show up in the list below as overdue,
 * so the card only names them and offers no extra actions.
 */
export default function YesterdayCard({ review, note }: YesterdayCardProps) {
  const { openTaskDrawer } = useTaskDrawer();

  const meta = review?.day.toLocaleDateString(APP_LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <DashboardCard title="Yesterday" meta={meta} source={note ? "improvement agent" : undefined}>
      {!review ? (
        <div className="min-h-16" />
      ) : review.total === 0 ? (
        <EmptyState
          compact
          icon={History}
          title="Nothing was due yesterday."
          hint="A quiet day — Morgen had nothing to report."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Score done={review.done} total={review.total} />
          {review.missed.length === 0 ? (
            <p className="text-sm text-muted">Clean sweep.</p>
          ) : (
            <div>
              <p className="font-mono text-eyebrow text-faint uppercase">Left open</p>
              <ul className="mt-1 -mx-1.5 flex flex-col">
                {review.missed.slice(0, MAX_LISTED).map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => openTaskDrawer(task.id)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-field px-1.5 py-1 text-left text-sm outline-none hover:bg-line-strong focus-visible:shadow-focus"
                    >
                      {/* Fixed slot, so titles line up with or without a priority dot. */}
                      <span className="flex w-1.5 shrink-0">
                        <PriorityDot priority={task.priority} />
                      </span>
                      <span className="min-w-0 truncate">{task.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {review.missed.length > MAX_LISTED && (
                <p className="mt-1 text-xs text-subtle">
                  + {review.missed.length - MAX_LISTED} more
                </p>
              )}
            </div>
          )}
          {note && <p className="text-sm text-base-content/80">{note}</p>}
        </div>
      )}
    </DashboardCard>
  );
}

function Score({ done, total }: { done: number; total: number }) {
  const allDone = done === total;
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span
          aria-hidden
          className={`font-mono text-2xl font-semibold tabular-nums ${allDone ? "text-success" : ""}`}
        >
          {done}/{total}
        </span>
        <span aria-hidden className="text-sm text-muted">
          done
        </span>
        <span className="sr-only">
          {done} of {total} {total === 1 ? "task" : "tasks"} done
        </span>
      </p>
      <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
        <div
          className={`h-full rounded-full ${allDone ? "bg-success" : "bg-accent"}`}
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
