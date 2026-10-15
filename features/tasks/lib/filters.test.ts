import { describe, expect, it } from "vitest";
import { filterTasksByLabels } from "@/features/tasks/lib/filterTasksByLabels";
import { filterTasksByPriority } from "@/features/tasks/lib/filterTasksByPriority";
import { filterSeriesByLabels } from "@/features/series/lib/filterSeriesByLabels";
import { filterSeriesByPriority } from "@/features/series/lib/filterSeriesByPriority";
import { filterTasksByDay } from "@/features/tasks/lib/filterTasksByDay";
import { localDate, localIso, makeSeries, makeTask } from "@/lib/test/factories";

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("label filters (#120, #171)", () => {
  const tasks = [
    makeTask({ id: "w", labelIds: ["work"] }),
    makeTask({ id: "h", labelIds: ["home"] }),
    makeTask({ id: "wh", labelIds: ["work", "home"] }),
    makeTask({ id: "none" }),
  ];

  it("keeps everything without a selection", () => {
    expect(filterTasksByLabels(tasks, [])).toBe(tasks);
  });

  it("combines several labels with OR", () => {
    expect(ids(filterTasksByLabels(tasks, ["work"]))).toEqual(["w", "wh"]);
    expect(ids(filterTasksByLabels(tasks, ["work", "home"]))).toEqual(["w", "h", "wh"]);
    expect(filterTasksByLabels(tasks, ["unknown"])).toEqual([]);
  });

  it("works the same for series", () => {
    const series = [
      makeSeries({ id: "a", labelIds: ["work"] }),
      makeSeries({ id: "b", labelIds: [] }),
    ];
    expect(ids(filterSeriesByLabels(series, ["work"]))).toEqual(["a"]);
    expect(filterSeriesByLabels(series, [])).toBe(series);
  });
});

describe("priority filters (#140)", () => {
  const tasks = [
    makeTask({ id: "h", priority: "high" }),
    makeTask({ id: "l", priority: "low" }),
    makeTask({ id: "n", priority: "none" }),
  ];

  it("filters by one priority, 'none' included; 'all' keeps everything", () => {
    expect(ids(filterTasksByPriority(tasks, "high"))).toEqual(["h"]);
    expect(ids(filterTasksByPriority(tasks, "none"))).toEqual(["n"]);
    expect(ids(filterTasksByPriority(tasks, "all"))).toEqual(["h", "l", "n"]);
  });

  it("works the same for series and combines with the label filter", () => {
    const series = [
      makeSeries({ id: "a", priority: "high", labelIds: ["home"] }),
      makeSeries({ id: "b", priority: "low" }),
    ];
    expect(ids(filterSeriesByPriority(series, "low"))).toEqual(["b"]);
    expect(filterTasksByLabels(filterTasksByPriority(series, "high"), ["work"])).toEqual([]);
  });
});

describe("filterTasksByDay (week-ahead strip, calendar day)", () => {
  const tasks = [
    makeTask({ id: "morning", dueDate: localIso(2026, 10, 14, 0, 30) }),
    makeTask({ id: "night", dueDate: localIso(2026, 10, 14, 23, 30) }),
    makeTask({ id: "allDay", dueDate: localIso(2026, 10, 14), allDay: true }),
    makeTask({ id: "nextDay", dueDate: localIso(2026, 10, 15, 0, 0) }),
    makeTask({ id: "done", status: "done", dueDate: localIso(2026, 10, 14, 9) }),
    makeTask({ id: "backlog", dueDate: null }),
  ];

  it("keeps open tasks due on that local day only", () => {
    expect(ids(filterTasksByDay(tasks, localDate(2026, 10, 14, 18)))).toEqual([
      "morning",
      "night",
      "allDay",
    ]);
  });
});
