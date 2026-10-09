import type { Task } from "@/lib/types";
import { APP_LOCALE } from "@/lib/constants/locale";
import { formatDueDate, formatTime, isOverdue } from "@/lib/utils/formatDueDate";

export type DueMetaTone = "accent" | "error" | "muted";
export type DueMeta = { text: string; tone: DueMetaTone };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole local calendar days from `from` to `to` (DST-safe via rounding). */
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/**
 * The due-date part of a task card's meta line (#237), with a tone:
 * - open and overdue → "Wed 7 Oct · 2 days late" (or "15:00 · overdue"
 *   when it was due earlier today), error
 * - due today → "15:00" or "Today"; accent while open, muted once done
 * - due tomorrow → "Tomorrow" / "Tomorrow, 09:00", muted
 * - otherwise → "10 Oct" / "10 Oct, 14:00", muted
 * Skipped tasks get " · skipped". Pure, `now` passed in; null without a
 * due date (backlog cards show their age instead).
 */
export function dueMeta(task: Task, now: Date): DueMeta | null {
  if (task.dueDate === null) return null;
  const due = new Date(task.dueDate);
  const time = task.allDay ? null : formatTime(task.dueDate);
  const suffix = task.status === "skipped" ? " · skipped" : "";

  if (task.status === "open" && isOverdue(task.dueDate, task.allDay, now)) {
    const days = calendarDaysBetween(due, now);
    if (days === 0) return { text: `${time} · overdue`, tone: "error" };
    const date = due.toLocaleDateString(APP_LOCALE, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return { text: `${date} · ${days} ${days === 1 ? "day" : "days"} late`, tone: "error" };
  }

  const dayOffset = calendarDaysBetween(now, due);
  if (dayOffset === 0) {
    return {
      text: (time ?? "Today") + suffix,
      tone: task.status === "open" ? "accent" : "muted",
    };
  }
  if (dayOffset === 1) {
    return { text: (time ? `Tomorrow, ${time}` : "Tomorrow") + suffix, tone: "muted" };
  }
  return { text: formatDueDate(task.dueDate, task.allDay) + suffix, tone: "muted" };
}
