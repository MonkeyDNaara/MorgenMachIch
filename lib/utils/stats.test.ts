import { describe, expect, it } from "vitest";
import {
  applyStatsStart,
  completionsByDay,
  completionsByLabel,
  dailySeries,
  onTimeRate,
  periodStart,
  periodTotals,
  startOfLocalWeek,
  streakSummary,
  weeklySeries,
  yearHeatmap,
} from "@/lib/utils/stats";
import { localDate, localIso, makeTask } from "@/lib/test/factories";
import type { Task } from "@/lib/types";

const NOW = localDate(2026, 10, 9, 15); // Fri 9 Oct 2026 15:00
/** Noon by default, so a test never sits on a day boundary by accident. */
const at = (y: number, m: number, d: number, h = 12) => localIso(y, m, d, h);
const done = (completedAt: string, overrides: Partial<Task> = {}) =>
  makeTask({ status: "done", completedAt, dueDate: null, ...overrides });
/** byDay map from [month, day] pairs in 2026, one completion each. */
const days = (...pairs: [number, number][]) =>
  completionsByDay(pairs.map(([m, d]) => done(at(2026, m, d))));

describe("completionsByDay", () => {
  it("counts done tasks with completedAt per local day", () => {
    const byDay = completionsByDay([
      done(at(2026, 10, 9, 0)),
      done(at(2026, 10, 9, 23)),
      done(at(2026, 10, 8)),
      makeTask({ status: "open", completedAt: null }),
      makeTask({ status: "skipped", completedAt: at(2026, 10, 7) }),
      makeTask({ status: "done", completedAt: null }),
    ]);
    expect([...byDay]).toEqual([
      ["2026-10-09", 2],
      ["2026-10-08", 1],
    ]);
  });
});

describe("streakSummary", () => {
  it("counts consecutive days ending today", () => {
    expect(streakSummary(days([10, 9], [10, 8], [10, 7]), NOW)).toEqual({
      current: 3,
      best: 3,
      completedToday: true,
      atRisk: false,
    });
  });

  it("keeps a streak alive through yesterday, but at risk (today isn't over)", () => {
    expect(streakSummary(days([10, 8], [10, 7]), NOW)).toEqual({
      current: 2,
      best: 2,
      completedToday: false,
      atRisk: true,
    });
  });

  it("breaks on a missed yesterday but remembers the best streak", () => {
    const summary = streakSummary(days([10, 7], [10, 6]), NOW);
    expect([summary.current, summary.best]).toEqual([0, 2]);
    expect(streakSummary(days([9, 1], [9, 2], [9, 3], [9, 4], [10, 9]), NOW)).toEqual({
      current: 1,
      best: 4,
      completedToday: true,
      atRisk: false,
    });
  });

  it("is all zero without completions", () => {
    expect(streakSummary(new Map(), NOW)).toEqual({
      current: 0,
      best: 0,
      completedToday: false,
      atRisk: false,
    });
  });

  it("runs across month and year ends", () => {
    const yearEnd = completionsByDay([
      done(at(2026, 12, 30)),
      done(at(2026, 12, 31)),
      done(at(2027, 1, 1)),
    ]);
    expect(streakSummary(yearEnd, localDate(2027, 1, 1, 9)).current).toBe(3);
    const monthEnd = completionsByDay([done(at(2026, 9, 30)), done(at(2026, 10, 1))]);
    expect(streakSummary(monthEnd, localDate(2026, 10, 1, 9)).current).toBe(2);
  });

  it("runs across the EU and US DST changes", () => {
    const eu = completionsByDay([24, 25, 26].map((d) => done(at(2026, 10, d, 1))));
    expect(streakSummary(eu, localDate(2026, 10, 26, 20)).current).toBe(3);
    const us = completionsByDay([
      done(at(2026, 10, 31, 1)),
      done(at(2026, 11, 1, 1)),
      done(at(2026, 11, 2, 1)),
    ]);
    expect(streakSummary(us, localDate(2026, 11, 2, 20)).best).toBe(3);
  });
});

describe("periods", () => {
  const byDay = completionsByDay([
    done(at(2026, 10, 9)),
    done(at(2026, 10, 9)),
    done(at(2026, 10, 5, 0)),
    done(at(2026, 10, 4, 23)),
    done(at(2026, 10, 1)),
    done(at(2026, 9, 30)),
  ]);

  it("totals today, the Monday-based week and the month", () => {
    expect(periodTotals(byDay, NOW)).toEqual({ today: 2, thisWeek: 3, thisMonth: 5 });
  });

  it("starts the week on Monday", () => {
    expect(startOfLocalWeek(localDate(2026, 10, 11)).getDate()).toBe(5);
    expect(startOfLocalWeek(localDate(2026, 10, 5)).getDate()).toBe(5);
  });

  it("builds a daily series ending today", () => {
    const series = dailySeries(byDay, NOW, 7);
    expect(series.map((d) => d.key)).toEqual([
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
    expect(series.map((d) => d.count)).toEqual([0, 1, 1, 0, 0, 0, 2]);
    expect(dailySeries(byDay, NOW, 30)).toHaveLength(30);
  });

  it("returns the start of the 7-day and 30-day periods, null for all", () => {
    expect(periodStart("all", NOW)).toBeNull();
    expect(periodStart("7d", NOW)?.getDate()).toBe(3);
    expect(periodStart("30d", NOW)?.toDateString()).toBe(localDate(2026, 9, 10).toDateString());
  });
});

describe("weeklySeries (#217)", () => {
  const byDay = completionsByDay([
    done(at(2026, 10, 9)),
    done(at(2026, 10, 5, 0)),
    done(at(2026, 10, 4, 23)),
    done(at(2026, 9, 28)),
    done(at(2025, 10, 1)),
  ]);

  it("groups by Monday-based weeks, newest last", () => {
    const weeks = weeklySeries(byDay, NOW, 52);
    expect(weeks).toHaveLength(52);
    expect([weeks.at(-1)!.key, weeks.at(-1)!.count]).toEqual(["2026-10-05", 2]);
    expect([weeks.at(-2)!.key, weeks.at(-2)!.count]).toEqual(["2026-09-28", 2]);
    expect(weeks.every((w) => w.date.getDay() === 1)).toBe(true);
    expect(weeks.reduce((sum, w) => sum + w.count, 0)).toBe(4); // 1 Oct 2025 is older than 52 weeks
  });

  it("is all zero without completions", () => {
    expect(weeklySeries(new Map(), NOW, 4).map((w) => w.count)).toEqual([0, 0, 0, 0]);
  });
});

describe("yearHeatmap (#216)", () => {
  const byDay = completionsByDay([
    done(at(2026, 10, 9)),
    done(at(2026, 10, 9)),
    done(at(2026, 10, 5, 0)),
    done(at(2026, 10, 4, 23)),
    done(at(2026, 10, 1)),
    done(at(2026, 9, 30)),
  ]);
  const heatmap = yearHeatmap(byDay, NOW);
  const lastWeek = heatmap.weeks[52];

  it("has 53 Monday-first weeks of 7 days", () => {
    expect(heatmap.weeks).toHaveLength(53);
    expect(heatmap.weeks.every((week) => week.length === 7)).toBe(true);
    expect(heatmap.weeks.every((week) => week[0].date.getDay() === 1)).toBe(true);
  });

  it("ends with this week, flagging future days", () => {
    expect([lastWeek[0].key, lastWeek[4].key, lastWeek[4].count]).toEqual([
      "2026-10-05",
      "2026-10-09",
      2,
    ]);
    expect(lastWeek.map((cell) => cell.future)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it("scales levels to the busiest day", () => {
    expect([heatmap.total, heatmap.max]).toEqual([6, 2]);
    expect([lastWeek[4].level, lastWeek[0].level, lastWeek[1].level]).toEqual([4, 2, 0]);
    const empty = yearHeatmap(new Map(), NOW);
    expect([empty.max, empty.weeks[52][4].level]).toEqual([0, 0]);
  });

  it("places month labels in order, ending with the current month", () => {
    expect(
      heatmap.months.every((m, i) => i === 0 || m.weekIndex > heatmap.months[i - 1].weekIndex),
    ).toBe(true);
    expect(heatmap.months.at(-1)!.label).toBe("Oct");
  });
});

describe("completionsByLabel (#218)", () => {
  const tasks = [
    done(at(2026, 10, 9), { labelIds: ["a", "b"] }),
    done(at(2026, 10, 8), { labelIds: ["a"] }),
    done(at(2026, 10, 8)),
    done(at(2026, 9, 1), { labelIds: ["b"] }),
    makeTask({ status: "open", completedAt: null, labelIds: ["a"] }),
  ];

  it("counts a task once per label, with a 'no label' bucket", () => {
    expect(completionsByLabel(tasks, null)).toEqual([
      { labelId: "a", count: 2 },
      { labelId: "b", count: 2 },
      { labelId: null, count: 1 },
    ]);
  });

  it("limits to the period", () => {
    expect(completionsByLabel(tasks, periodStart("7d", NOW))).toEqual([
      { labelId: "a", count: 2 },
      { labelId: "b", count: 1 },
      { labelId: null, count: 1 },
    ]);
    expect(completionsByLabel([], null)).toEqual([]);
  });
});

describe("onTimeRate (#218)", () => {
  const tasks = [
    done(at(2026, 10, 9, 18), { dueDate: at(2026, 10, 9, 10) }), // same day, later → on time
    done(at(2026, 10, 8), { dueDate: at(2026, 10, 9) }), // early
    done(at(2026, 10, 9), { dueDate: at(2026, 10, 8) }), // late
    done(at(2026, 10, 9)), // no due date → not counted
    done(at(2026, 8, 1), { dueDate: at(2026, 8, 5) }), // old, on time
  ];

  it("compares completion and due day, ignoring backlog tasks", () => {
    expect(onTimeRate(tasks, null)).toEqual({ onTime: 3, total: 4, rate: 0.75 });
    expect(onTimeRate(tasks, periodStart("7d", NOW))).toEqual({ onTime: 2, total: 3, rate: 2 / 3 });
  });

  it("has no rate without dated tasks", () => {
    expect(onTimeRate([], null)).toEqual({ onTime: 0, total: 0, rate: null });
  });
});

describe("applyStatsStart (#226)", () => {
  const tasks = [
    done(at(2026, 10, 7)),
    done(at(2026, 10, 9, 0)),
    done(at(2026, 10, 9, 18)),
    makeTask({ status: "open", completedAt: null }),
  ];
  const since = localIso(2026, 10, 9);

  it("returns the same list without a start date", () => {
    expect(applyStatsStart(tasks, null)).toBe(tasks);
  });

  it("drops completions before the start date, keeps open tasks", () => {
    expect(applyStatsStart(tasks, since).map((t) => t.completedAt)).toEqual([
      at(2026, 10, 9, 0),
      at(2026, 10, 9, 18),
      null,
    ]);
  });

  it("starts streaks fresh from the start date", () => {
    const streak = streakSummary(
      completionsByDay(applyStatsStart(tasks, since)),
      localDate(2026, 10, 9, 20),
    );
    expect([streak.current, streak.best]).toEqual([1, 1]);
  });
});
