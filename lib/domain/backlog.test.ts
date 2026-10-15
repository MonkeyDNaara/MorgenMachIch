import { describe, expect, it } from "vitest";
import {
  formatTaskAge,
  isBacklogTask,
  planBacklogReorder,
  sortBacklogTasks,
} from "@/lib/domain/backlog";
import type { Task } from "@/lib/types";
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

  it("puts tasks with a manual key first, by key, then the rest by priority → age (#75)", () => {
    const tasks = [
      makeTask({ id: "a", priority: "high", createdAt: "2026-01-01T00:00:00.000Z" }),
      makeTask({ id: "b", sortOrder: "k" }),
      makeTask({ id: "c", priority: "low", createdAt: "2025-01-01T00:00:00.000Z" }),
      makeTask({ id: "d", priority: "high", sortOrder: "V" }),
      makeTask({ id: "e", sortOrder: "B" }),
    ];
    expect(ids(sortBacklogTasks(tasks))).toBe("edbac");
  });

  it("compares keys by code unit, not by locale ('B' before 'a')", () => {
    const tasks = [makeTask({ id: "x", sortOrder: "a" }), makeTask({ id: "y", sortOrder: "B" })];
    expect(ids(sortBacklogTasks(tasks))).toBe("yx");
  });

  it("breaks equal keys by priority → age", () => {
    const tasks = [
      makeTask({ id: "x", sortOrder: "V", priority: "low" }),
      makeTask({ id: "y", sortOrder: "V", priority: "high" }),
    ];
    expect(ids(sortBacklogTasks(tasks))).toBe("yx");
  });
});

const ids = (tasks: Task[]) => tasks.map((t) => t.id).join("");

describe("planBacklogReorder (#75)", () => {
  /** Applies the planned keys and returns the new order. */
  const move = (backlog: Task[], id: string, prev: string | null, next: string | null) => {
    const keys = planBacklogReorder(backlog, id, prev, next);
    return {
      keys,
      order: ids(
        sortBacklogTasks(
          backlog.map((t) => (keys.has(t.id) ? { ...t, sortOrder: keys.get(t.id)! } : t)),
        ),
      ),
    };
  };
  const unkeyed = () => [
    makeTask({ id: "a", priority: "high" }),
    makeTask({ id: "b", priority: "medium" }),
    makeTask({ id: "c", priority: "low" }),
    makeTask({ id: "d", priority: "none" }),
  ];
  const keyed = () => [
    makeTask({ id: "a", sortOrder: "F" }),
    makeTask({ id: "b", sortOrder: "M" }),
    makeTask({ id: "c", sortOrder: "V" }),
    makeTask({ id: "d", sortOrder: "k" }),
  ];

  it("gives every task a key in its current order on the first move", () => {
    const { keys, order } = move(unkeyed(), "d", "a", "b");
    expect(keys.size).toBe(4);
    expect(order).toBe("adbc");
  });

  it("only changes the moved task once every task has a distinct key", () => {
    const { keys, order } = move(keyed(), "a", "c", "d");
    expect([...keys.keys()]).toEqual(["a"]);
    expect(order).toBe("bcad");
  });

  it.each([
    ["to the top", "c", null, "a", "cabd"],
    ["to the bottom", "a", "d", null, "bcda"],
    ["one down", "b", "c", "d", "acbd"],
    ["to its own place", "b", "a", "c", "abcd"],
  ])("moves %s", (_name, id, prev, next, expected) => {
    expect(move(keyed(), id, prev, next).order).toBe(expected);
    expect(move(unkeyed(), id, prev, next).order).toBe(expected);
  });

  it("lands between the visible neighbours when a filter hides tasks in between", () => {
    // Visible: a, c, d (b is filtered out). Moving d between a and c.
    const { order } = move(keyed(), "d", "a", "c");
    expect(order.indexOf("d")).toBeGreaterThan(order.indexOf("a"));
    expect(order.indexOf("d")).toBeLessThan(order.indexOf("c"));
  });

  it("re-keys everything when a task without a key joins (a new task)", () => {
    const backlog = [...keyed(), makeTask({ id: "e" })];
    const { keys, order } = move(backlog, "e", null, "a");
    expect(keys.size).toBe(5);
    expect(order).toBe("eabcd");
  });

  it("re-keys everything when two tasks share a key (a planned task came back)", () => {
    const backlog = keyed().map((t) => (t.id === "d" ? { ...t, sortOrder: "M" } : t));
    const { keys } = move(backlog, "a", "c", null);
    expect(keys.size).toBe(4);
    expect(new Set(keys.values()).size).toBe(4);
  });

  it("throws for unknown ids and a task as its own neighbour", () => {
    expect(() => planBacklogReorder(keyed(), "x", null, null)).toThrow("Not a Backlog task: x");
    expect(() => planBacklogReorder(keyed(), "a", "x", null)).toThrow("Not a Backlog task: x");
    expect(() => planBacklogReorder(keyed(), "a", "a", null)).toThrow("own neighbour");
  });

  it("throws when the neighbours are passed the wrong way round", () => {
    expect(() => planBacklogReorder(keyed(), "a", "d", "b")).toThrow("out of order");
  });

  it("works in an empty-otherwise backlog", () => {
    const { keys } = move([makeTask({ id: "solo" })], "solo", null, null);
    expect(keys.get("solo")).toBe("V");
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
