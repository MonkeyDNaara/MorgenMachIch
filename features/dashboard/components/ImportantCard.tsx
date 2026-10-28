"use client";

import { Flag } from "lucide-react";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import EmptyState from "@/components/ui/EmptyState";
import PriorityDot from "@/features/tasks/components/card/PriorityDot";
import { useTaskDrawer } from "@/features/tasks/components/drawer/TaskDrawerProvider";
import { formatTime } from "@/features/tasks/lib/formatDueDate";
import type { ImportantItem } from "@/features/dashboard/lib/importantItems";
import { APP_LOCALE } from "@/lib/constants/locale";

/** How many items are listed before "+ n more". */
const MAX_LISTED = 5;

const EMPTY_TITLE = "Nothing urgent.";
const EMPTY_HINT = "Morgen can wait.";

type ImportantCardProps = {
  /** undefined while tasks are still loading. */
  items: ImportantItem[] | undefined;
};

/**
 * Dashboard card "Important" (#424): what must not slip today — open
 * high-priority tasks from earlier days ("overdue · Tue"), then today's by
 * time, then today's all-day ones. A compact highlight of tasks that are
 * also in the list below: clicking one opens the task drawer, nothing else.
 * Empty, it shrinks to one line on mobile, where it is the first card.
 */
export default function ImportantCard({ items }: ImportantCardProps) {
  const { openTaskDrawer } = useTaskDrawer();
  const count = items?.length ?? 0;

  return (
    <DashboardCard
      title="Important"
      meta={count > 0 ? <span className="text-error">{count}</span> : undefined}
    >
      {!items ? (
        <div className="min-h-6 md:min-h-16" />
      ) : count === 0 ? (
        <>
          <p className="text-sm text-muted md:hidden">
            {EMPTY_TITLE} {EMPTY_HINT}
          </p>
          <div className="hidden md:block">
            <EmptyState compact icon={Flag} title={EMPTY_TITLE} hint={EMPTY_HINT} />
          </div>
        </>
      ) : (
        <div>
          <ul className="-mx-1.5 flex flex-col">
            {items.slice(0, MAX_LISTED).map((item) => (
              <li key={`${item.kind}-${item.task.id}`}>
                <button
                  type="button"
                  onClick={() => openTaskDrawer(item.task.id)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-field px-1.5 py-1 text-left text-sm outline-none hover:bg-line-strong focus-visible:shadow-focus"
                >
                  <span className="flex w-1.5 shrink-0">
                    <PriorityDot priority={item.task.priority} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.task.title}</span>
                  <WhenLabel item={item} />
                </button>
              </li>
            ))}
          </ul>
          {count > MAX_LISTED && (
            <p className="mt-1 text-xs text-subtle">+ {count - MAX_LISTED} more</p>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

function WhenLabel({ item }: { item: ImportantItem }) {
  const { when, task } = item;
  const base = "shrink-0 font-mono text-meta";
  if (when.type === "overdue") {
    const weekday = when.day.toLocaleDateString(APP_LOCALE, { weekday: "short" });
    return <span className={`${base} text-error`}>overdue · {weekday}</span>;
  }
  if (when.type === "time" && task.dueDate) {
    return (
      <span className={`${base} ${when.late ? "text-error" : "text-accent"}`}>
        {formatTime(task.dueDate)}
      </span>
    );
  }
  return <span className={`${base} text-faint`}>all day</span>;
}
