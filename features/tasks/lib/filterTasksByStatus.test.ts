import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { filterTasksByStatus } from "@/features/tasks/lib/filterTasksByStatus";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

// The overdue check reads the clock, so freeze it: Fri 9 Oct 2026 10:00.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(localDate(2026, 10, 9, 10));
});
afterEach(() => vi.useRealTimers());

const tasks = [
  makeTask({ id: "open", dueDate: localIso(2026, 10, 9, 15) }),
  makeTask({ id: "late", dueDate: localIso(2026, 10, 8, 9) }),
  makeTask({ id: "lateAllDay", dueDate: localIso(2026, 10, 8), allDay: true }),
  makeTask({ id: "todayAllDay", dueDate: localIso(2026, 10, 9), allDay: true }),
  makeTask({ id: "backlog", dueDate: null }),
  makeTask({ id: "done", status: "done", dueDate: localIso(2026, 10, 1) }),
  makeTask({ id: "skipped", status: "skipped", dueDate: localIso(2026, 10, 1) }),
];
const ids = (status: Parameters<typeof filterTasksByStatus>[1]) =>
  filterTasksByStatus(tasks, status).map((t) => t.id);

describe("filterTasksByStatus (#123, #61)", () => {
  it("'all' shows everything except skipped occurrences", () => {
    expect(ids("all")).toEqual(["open", "late", "lateAllDay", "todayAllDay", "backlog", "done"]);
  });

  it("filters by a single status", () => {
    expect(ids("open")).toEqual(["open", "late", "lateAllDay", "todayAllDay", "backlog"]);
    expect(ids("done")).toEqual(["done"]);
    expect(ids("skipped")).toEqual(["skipped"]);
  });

  it("'overdue' means open, dated and past — an all-day task only from the next day on", () => {
    expect(ids("overdue")).toEqual(["late", "lateAllDay"]);
  });
});
