import { describe, expect, it } from "vitest";
import { importantItems, importantSummary } from "@/features/dashboard/lib/importantItems";
import { dayKey, localDate, localIso, makeTask } from "@/lib/test/factories";

// Wed 28 Oct 2026, 10:00 local.
const NOW = localDate(2026, 10, 28, 10);
const high = (overrides = {}) => makeTask({ priority: "high", ...overrides });

describe("importantItems (#424)", () => {
  it("keeps only open high-priority tasks due today or earlier", () => {
    const items = importantItems(
      [
        high({ title: "Today", dueDate: localIso(2026, 10, 28, 15) }),
        high({ title: "Overdue", dueDate: localIso(2026, 10, 20, 9) }),
        high({ title: "Tomorrow", dueDate: localIso(2026, 10, 29, 9) }),
        high({ title: "Backlog", dueDate: null }),
        high({ title: "Done", dueDate: localIso(2026, 10, 28, 9), status: "done" }),
        high({ title: "Skipped", dueDate: localIso(2026, 10, 28, 9), status: "skipped" }),
        makeTask({ title: "Medium", priority: "medium", dueDate: localIso(2026, 10, 28, 9) }),
      ],
      NOW,
    );
    expect(items.map((item) => item.task.title)).toEqual(["Overdue", "Today"]);
  });

  it("orders earlier days first, then today by time, then all-day", () => {
    const items = importantItems(
      [
        high({ title: "All day", dueDate: localIso(2026, 10, 28), allDay: true }),
        high({ title: "Afternoon", dueDate: localIso(2026, 10, 28, 15) }),
        high({ title: "Morning (late)", dueDate: localIso(2026, 10, 28, 8) }),
        high({ title: "Yesterday all day", dueDate: localIso(2026, 10, 27), allDay: true }),
        high({ title: "Last week", dueDate: localIso(2026, 10, 21, 18) }),
      ],
      NOW,
    );
    expect(items.map((item) => item.task.title)).toEqual([
      "Last week",
      "Yesterday all day",
      "Morning (late)",
      "Afternoon",
      "All day",
    ]);
  });

  it("labels when each one is due", () => {
    const [overdue, late, upcoming, allDay] = importantItems(
      [
        high({ dueDate: localIso(2026, 10, 27, 23, 30) }),
        high({ dueDate: localIso(2026, 10, 28, 9, 59) }),
        high({ dueDate: localIso(2026, 10, 28, 10, 1) }),
        high({ dueDate: localIso(2026, 10, 28), allDay: true }),
      ],
      NOW,
    );
    expect(overdue.when.type).toBe("overdue");
    if (overdue.when.type === "overdue") expect(dayKey(overdue.when.day)).toBe("2026-10-27");
    expect(late.when).toEqual({ type: "time", late: true });
    expect(upcoming.when).toEqual({ type: "time", late: false });
    expect(allDay.when).toEqual({ type: "all-day" });
  });

  it("uses local day boundaries across the DST change", () => {
    const monday = localDate(2026, 10, 26, 0, 30);
    const items = importantItems(
      [
        high({ title: "Sun late", dueDate: localIso(2026, 10, 25, 23, 45) }),
        high({ title: "Mon early", dueDate: localIso(2026, 10, 26, 0, 15) }),
      ],
      monday,
    );
    expect(items.map((item) => [item.task.title, item.when.type])).toEqual([
      ["Sun late", "overdue"],
      ["Mon early", "time"],
    ]);
  });
});

describe("importantSummary", () => {
  it("counts items, or nothing when empty", () => {
    const items = importantItems([high({ dueDate: localIso(2026, 10, 28, 15) })], NOW);
    expect(importantSummary(items)).toBe("1 important");
    expect(importantSummary([])).toBeNull();
  });
});
