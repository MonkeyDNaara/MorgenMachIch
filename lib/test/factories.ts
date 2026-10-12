import type { RecurrenceRule, Task, TaskSeries } from "@/lib/types";

/**
 * Test-only builders (#340). Every date helper here works with **local**
 * date parts, so the same test means the same calendar day in every time
 * zone of the CI matrix.
 */

/** ISO string for a local date/time (`month` is 1-based, like a calendar). */
export function localIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

/** A local Date (`month` is 1-based). */
export function localDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

/** "YYYY-MM-DD" of a Date's local calendar day — easy to read in assertions. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

let counter = 0;

/** An open, timed task due Fri 9 Oct 2026 12:00 local, unless overridden. */
export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1;
  return {
    id: `task-${counter}`,
    title: "Task",
    status: "open",
    priority: "none",
    dueDate: localIso(2026, 10, 9, 12),
    allDay: false,
    labelIds: [],
    subtasks: [],
    seriesId: null,
    createdAt: localIso(2026, 10, 1, 9),
    updatedAt: localIso(2026, 10, 1, 9),
    completedAt: null,
    ...overrides,
  };
}

/** An active daily all-day series starting Tue 1 Sep 2026, unless overridden. */
export function makeSeries(overrides: Partial<TaskSeries> = {}): TaskSeries {
  counter += 1;
  return {
    id: `series-${counter}`,
    title: "Series",
    priority: "none",
    labelIds: [],
    subtaskTemplate: [],
    recurrence: { frequency: "daily", interval: 1 },
    startDate: localIso(2026, 9, 1),
    allDay: true,
    active: true,
    createdAt: localIso(2026, 9, 1),
    updatedAt: localIso(2026, 9, 1),
    ...overrides,
  };
}

/** Shorthand for a recurrence rule with `interval: 1` by default. */
export function rule(
  overrides: Partial<RecurrenceRule> & Pick<RecurrenceRule, "frequency">,
): RecurrenceRule {
  return { interval: 1, ...overrides } as RecurrenceRule;
}
