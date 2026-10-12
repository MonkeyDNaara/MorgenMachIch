import { describe, expect, it } from "vitest";
import { formatTaskAge, isBacklogTask, sortBacklogTasks } from "@/lib/utils/backlog";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

describe("isBacklogTask (#182)", () => {
  it("is an open, standalone task without a due date", () => {
    expect(isBacklogTask(makeTask({ dueDate: null }))).toBe(true);
  });

  it.each([
    ["done", { status: "done" as const }],
    ["skipped", { status: "skipped" as const }],
    ["dated", { dueDate: localIso(2026, 10, 10) }],
    ["a series occurrence", { seriesId: "s1" }],
  ])("excludes %s tasks", (_name, overrides) => {
    expect(isBacklogTask(makeTask({ dueDate: null, ...overrides }))).toBe(false);
  });
});

describe("sortBacklogTasks", () => {
  it("sorts by priority (high first), then oldest first", () => {
    const tasks = [
      makeTask({ id: "a", priority: "low", createdAt: "2026-01-01T00:00:00.000Z" }),
      makeTask({ id: "b", priority: "none", createdAt: "2025-01-01T00:00:00.000Z" }),
      makeTask({ id: "c", priority: "high", createdAt: "2026-03-01T00:00:00.000Z" }),
      makeTask({ id: "d", priority: "high", createdAt: "2026-02-01T00:00:00.000Z" }),
      makeTask({ id: "e", priority: "medium", createdAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(
      sortBacklogTasks(tasks)
        .map((t) => t.id)
        .join(""),
    ).toBe("dceab");
  });

  it("does not change the input array", () => {
    const tasks = [makeTask({ id: "x", priority: "low" }), makeTask({ id: "y", priority: "high" })];
    sortBacklogTasks(tasks);
    expect(tasks.map((t) => t.id)).toEqual(["x", "y"]);
  });
});

describe("formatTaskAge", () => {
  const NOW = localDate(2026, 10, 8, 12);
  const daysAgo = (days: number) => localIso(2026, 10, 8 - days, 12);

  it.each([
    [0, "today"],
    [1, "1d ago"],
    [6, "6d ago"],
    [7, "1w ago"],
    [13, "1w ago"],
    [14, "2w ago"],
    [59, "8w ago"],
    [60, "2mo ago"],
    [364, "12mo ago"],
    [365, "1y ago"],
    [800, "2y ago"],
  ])("%i days → %s", (days, expected) => {
    expect(formatTaskAge(daysAgo(days), NOW)).toBe(expected);
  });

  it("counts calendar days: late last night is '1d ago' this morning", () => {
    expect(formatTaskAge(localIso(2026, 10, 7, 23, 50), localDate(2026, 10, 8, 0, 10))).toBe(
      "1d ago",
    );
  });

  it("never goes negative for a future timestamp", () => {
    expect(formatTaskAge(localIso(2026, 10, 9), NOW)).toBe("today");
  });
});
