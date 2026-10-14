import { describe, expect, it } from "vitest";
import { LabelSchema, TaskSchema, TaskSeriesSchema } from "@/lib/types";
import { completionsByDay, onTimeRate, streakSummary } from "@/lib/utils/stats";
import { occurrencesBetween } from "@/lib/utils/recurrence";
import { dateKey } from "@/lib/utils/groupTasksByDate";
import { compareOrderKeys } from "@/lib/utils/orderKey";
import { SAMPLE_DAYS_OFF, buildSampleData } from "./sampleData";

const HORIZON = 60;

function build(now: Date) {
  let n = 0;
  return buildSampleData(now, () => `id-${++n}`, HORIZON);
}

// A Wednesday afternoon, an early Monday morning just after midnight, and
// a date right after the spring DST switch in Europe.
const NOWS = [
  new Date(2026, 9, 14, 15, 30),
  new Date(2026, 9, 19, 0, 2),
  new Date(2026, 2, 30, 12, 0),
];

describe.each(NOWS.map((now) => [now.toString(), now] as const))(
  "buildSampleData (%s)",
  (_, now) => {
    const data = build(now);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    it("passes the schemas", () => {
      data.labels.forEach((label) => LabelSchema.parse(label));
      data.taskSeries.forEach((series) => TaskSeriesSchema.parse(series));
      data.tasks.forEach((task) => TaskSchema.parse(task));
    });

    it("only references labels and series that exist", () => {
      const labelIds = new Set(data.labels.map((label) => label.id));
      const seriesIds = new Set(data.taskSeries.map((series) => series.id));
      for (const item of [...data.tasks, ...data.taskSeries]) {
        item.labelIds.forEach((id) => expect(labelIds.has(id)).toBe(true));
      }
      for (const task of data.tasks) {
        if (task.seriesId) expect(seriesIds.has(task.seriesId)).toBe(true);
      }
      const ids = [...data.labels, ...data.taskSeries, ...data.tasks].map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("never has timestamps in the future", () => {
      for (const task of data.tasks) {
        expect(new Date(task.createdAt).getTime()).toBeLessThanOrEqual(now.getTime());
        if (task.completedAt) {
          expect(new Date(task.completedAt).getTime()).toBeLessThanOrEqual(now.getTime());
        }
      }
    });

    it("has open work for today, two overdue tasks and upcoming tasks", () => {
      const open = data.tasks.filter((task) => task.status === "open" && task.seriesId === null);
      const dayOf = (iso: string) => dateKey(new Date(iso));
      expect(
        open.filter((t) => t.dueDate && dayOf(t.dueDate) === dateKey(today)).length,
      ).toBeGreaterThanOrEqual(4);
      expect(open.filter((t) => t.dueDate && new Date(t.dueDate) < today).length).toBe(2);
      expect(
        open.filter((t) => t.dueDate && new Date(t.dueDate) > now).length,
      ).toBeGreaterThanOrEqual(7);
    });

    it("puts five backlog tasks in a manual order", () => {
      const backlog = data.tasks.filter((task) => task.dueDate === null);
      expect(backlog).toHaveLength(5);
      const keys = backlog.map((task) => task.sortOrder!);
      expect([...keys].sort(compareOrderKeys)).toEqual(keys);
      expect(new Set(keys).size).toBe(5);
    });

    it("leaves no overdue occurrences of recurring series", () => {
      const pastOpen = data.tasks.filter(
        (task) => task.seriesId && task.status === "open" && new Date(task.dueDate!) < today,
      );
      expect(pastOpen).toEqual([]);
    });

    it("already contains every occurrence the generator would add", () => {
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + HORIZON);
      for (const series of data.taskSeries) {
        const start = new Date(series.startDate);
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const expected = occurrencesBetween(series.recurrence, startDay, yesterday, horizon).map(
          dateKey,
        );
        const actual = data.tasks
          .filter((task) => task.seriesId === series.id && new Date(task.dueDate!) >= today)
          .map((task) => dateKey(new Date(task.dueDate!)));
        expect(actual).toEqual(expected);
      }
    });

    it("gives the stats a current streak, a longer older one and some late tasks", () => {
      const byDay = completionsByDay(data.tasks);
      const streak = streakSummary(byDay, now);
      expect(streak.completedToday).toBe(true);
      expect(streak.current).toBe(SAMPLE_DAYS_OFF[0]);
      expect(streak.best).toBeGreaterThan(streak.current);
      const rate = onTimeRate(data.tasks, null);
      expect(rate.rate).toBeGreaterThan(0.6);
      expect(rate.rate).toBeLessThan(1);
    });
  },
);

describe("buildSampleData determinism", () => {
  it("returns the same data for the same moment", () => {
    expect(build(NOWS[0])).toEqual(build(NOWS[0]));
  });
});
