import { describe, expect, it } from "vitest";
import { dayProgress } from "@/lib/utils/dayProgress";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

const NOW = localDate(2026, 10, 9, 15);
const task = (overrides = {}) => makeTask({ dueDate: localIso(2026, 10, 9, 12), ...overrides });

describe("dayProgress (/today header bar, #233)", () => {
  it("is empty without tasks", () => {
    expect(dayProgress([], NOW)).toEqual({ done: 0, total: 0 });
  });

  it("counts open and done tasks due today", () => {
    expect(dayProgress([task(), task({ status: "done" })], NOW)).toEqual({ done: 1, total: 2 });
  });

  it("leaves out skipped, overdue, tomorrow's and backlog tasks", () => {
    expect(dayProgress([task({ status: "skipped" }), task()], NOW)).toEqual({ done: 0, total: 1 });
    expect(
      dayProgress(
        [
          task({ dueDate: localIso(2026, 10, 7, 9) }),
          task({ dueDate: localIso(2026, 10, 8, 23, 59), status: "done" }),
        ],
        NOW,
      ),
    ).toEqual({ done: 0, total: 0 });
    expect(dayProgress([task({ dueDate: localIso(2026, 10, 10) })], NOW)).toEqual({
      done: 0,
      total: 0,
    });
    expect(dayProgress([task({ dueDate: null })], NOW)).toEqual({ done: 0, total: 0 });
  });

  it("counts the whole local day, from all-day midnight to 23:59", () => {
    expect(
      dayProgress([task({ dueDate: localIso(2026, 10, 9), allDay: true, status: "done" })], NOW),
    ).toEqual({
      done: 1,
      total: 1,
    });
    expect(dayProgress([task({ dueDate: localIso(2026, 10, 9, 23, 59) })], NOW)).toEqual({
      done: 0,
      total: 1,
    });
  });

  it("counts recurring occurrences like any task", () => {
    expect(
      dayProgress([task({ seriesId: "s1", status: "done" }), task({ seriesId: "s1" })], NOW),
    ).toEqual({
      done: 1,
      total: 2,
    });
  });
});
