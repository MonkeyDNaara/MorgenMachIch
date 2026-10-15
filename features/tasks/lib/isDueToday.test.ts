import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  countOpenToday,
  isDueToday,
  isSameLocalDay,
  isTodayOrOverdue,
} from "@/features/tasks/lib/isDueToday";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

// Both helpers read the clock: freeze it at Fri 9 Oct 2026 10:00.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(localDate(2026, 10, 9, 10));
});
afterEach(() => vi.useRealTimers());

describe("isSameLocalDay / isDueToday", () => {
  it("compares local calendar days, from 00:00 to 23:59", () => {
    expect(isSameLocalDay(localIso(2026, 10, 9, 0), localDate(2026, 10, 9, 23, 59))).toBe(true);
    expect(isSameLocalDay(localIso(2026, 10, 9, 23, 59), localDate(2026, 10, 10))).toBe(false);
    expect(isDueToday(localIso(2026, 10, 9, 23, 59))).toBe(true);
    expect(isDueToday(localIso(2026, 10, 10))).toBe(false);
  });
});

describe("isTodayOrOverdue (/today, #126)", () => {
  it.each([
    ["due today, open", { dueDate: localIso(2026, 10, 9, 15) }, true],
    ["due today, done", { dueDate: localIso(2026, 10, 9, 15), status: "done" as const }, true],
    ["overdue, open", { dueDate: localIso(2026, 10, 7) }, true],
    ["overdue, done", { dueDate: localIso(2026, 10, 7), status: "done" as const }, false],
    ["tomorrow", { dueDate: localIso(2026, 10, 10) }, false],
    ["backlog", { dueDate: null }, false],
  ])("%s → %s", (_name, overrides, expected) => {
    expect(isTodayOrOverdue(makeTask(overrides))).toBe(expected);
  });
});

describe("countOpenToday (#187)", () => {
  it("counts open tasks due today or overdue, nothing else", () => {
    const tasks = [
      makeTask({ dueDate: localIso(2026, 10, 9, 15) }), // today
      makeTask({ dueDate: localIso(2026, 10, 7) }), // overdue
      makeTask({ dueDate: localIso(2026, 10, 9, 8), status: "done" }), // done today
      makeTask({ dueDate: localIso(2026, 10, 9), status: "skipped" }), // skipped
      makeTask({ dueDate: localIso(2026, 10, 10) }), // tomorrow
      makeTask({ dueDate: null }), // backlog
    ];
    expect(countOpenToday(tasks)).toBe(2);
    expect(countOpenToday([])).toBe(0);
  });
});
