import { describe, expect, it } from "vitest";
import { weekBarsLabel, weekComparison, weekSummary } from "@/features/dashboard/lib/weekSummary";
import { dayKey, localDate, localIso, makeTask } from "@/lib/test/factories";

// Wed 28 Oct 2026, 18:00 local → week Mon 26 Oct – Sun 1 Nov.
const NOW = localDate(2026, 10, 28, 18);
const done = (day: [number, number], due: [number, number] | null = null, hour = 12) =>
  makeTask({
    status: "done",
    completedAt: localIso(2026, day[0], day[1], hour),
    dueDate: due ? localIso(2026, due[0], due[1], 9) : null,
  });

describe("weekSummary (#425)", () => {
  it("counts completions per day Monday to Sunday, future days null", () => {
    const summary = weekSummary(
      [done([10, 26]), done([10, 26]), done([10, 28]), done([10, 25]), makeTask()],
      NOW,
      null,
    );
    expect(summary.days.map((day) => dayKey(day.date))).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(summary.days.map((day) => day.count)).toEqual([2, 0, 1, null, null, null, null]);
    expect(summary.todayIndex).toBe(2);
    expect(summary.done).toBe(3);
  });

  it("treats Sunday as the last day and Monday as a new week", () => {
    const sunday = weekSummary([done([11, 1]), done([10, 26])], localDate(2026, 11, 1, 20), null);
    expect(sunday.todayIndex).toBe(6);
    expect(sunday.done).toBe(2);
    const monday = weekSummary(
      [done([11, 1]), done([11, 2], null, 0)],
      localDate(2026, 11, 2, 1),
      null,
    );
    expect(monday.todayIndex).toBe(0);
    expect(monday.done).toBe(1);
    expect(monday.lastWeek).toBe(0); // last Monday (26 Oct) had nothing
  });

  it("keeps day boundaries across the DST change (Sun 25 Oct 2026)", () => {
    const summary = weekSummary(
      [done([10, 25], null, 23), done([10, 26], null, 0)],
      localDate(2026, 10, 26, 9),
      null,
    );
    expect(summary.days[0].count).toBe(1);
    expect(summary.lastWeek).toBe(0); // Mon 19 Oct
  });

  it("applies the stats start date like /stats", () => {
    const summary = weekSummary(
      [done([10, 26], [10, 26], 8), done([10, 27], [10, 27])],
      NOW,
      localIso(2026, 10, 27),
    );
    expect(summary.done).toBe(1);
    expect(summary.onTime.total).toBe(1);
  });

  it("measures on time over Monday until now", () => {
    const summary = weekSummary(
      [
        done([10, 26], [10, 26]), // on time
        done([10, 28], [10, 27]), // late
        done([10, 27], null), // no due date: not measured
        done([10, 23], [10, 23]), // last week: not this week
      ],
      NOW,
      null,
    );
    expect(summary.onTime).toEqual({ onTime: 1, total: 2, rate: 0.5 });
  });

  it("compares with the same span of last week", () => {
    const summary = weekSummary(
      [
        done([10, 26]),
        done([10, 19]),
        done([10, 21]),
        done([10, 22]), // Thursday last week: after today's weekday, not compared
      ],
      NOW,
      null,
    );
    expect(summary.lastWeek).toBe(2);
    expect(weekComparison(summary)).toBe("−1 vs. last week");
  });
});

describe("weekComparison + weekBarsLabel", () => {
  it("phrases the comparison", () => {
    const base = weekSummary([], NOW, null);
    expect(weekComparison(base)).toBeNull();
    expect(weekComparison({ ...base, done: 5, lastWeek: 2 })).toBe("+3 vs. last week");
    expect(weekComparison({ ...base, done: 2, lastWeek: 2 })).toBe("Same as last week");
  });

  it("sums the bars up for screen readers", () => {
    const summary = weekSummary([done([10, 26]), done([10, 28])], NOW, null);
    expect(weekBarsLabel(summary)).toBe("Done per day this week: Mon 1, Tue 0, Wed 1 (today)");
  });
});
