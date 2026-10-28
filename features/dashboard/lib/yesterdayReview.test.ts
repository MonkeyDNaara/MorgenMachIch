import { describe, expect, it } from "vitest";
import {
  previousLocalDay,
  yesterdayReview,
  yesterdaySummary,
} from "@/features/dashboard/lib/yesterdayReview";
import { dayKey, localDate, localIso, makeTask } from "@/lib/test/factories";

// Wed 28 Oct 2026, 09:00 local → yesterday is Tue 27 Oct.
const NOW = localDate(2026, 10, 28, 9);
const due = (day: number, hour = 12, minute = 0) => localIso(2026, 10, day, hour, minute);

describe("previousLocalDay (#423)", () => {
  it("is local midnight of the day before", () => {
    const day = previousLocalDay(NOW);
    expect(dayKey(day)).toBe("2026-10-27");
    expect(day.getHours()).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    expect(dayKey(previousLocalDay(localDate(2026, 11, 1, 0, 5)))).toBe("2026-10-31");
    expect(dayKey(previousLocalDay(localDate(2027, 1, 1, 8)))).toBe("2026-12-31");
  });

  it("gives Sunday on a Monday", () => {
    const monday = localDate(2026, 11, 2, 7);
    expect(previousLocalDay(monday).getDay()).toBe(0);
  });
});

describe("yesterdayReview", () => {
  it("counts yesterday's tasks: done (also finished today), open, skipped left out", () => {
    const review = yesterdayReview(
      [
        makeTask({ dueDate: due(27), status: "done" }),
        makeTask({ dueDate: due(27), status: "done", completedAt: due(28, 8) }),
        makeTask({ dueDate: due(27), title: "Open one" }),
        makeTask({ dueDate: due(27), status: "skipped" }),
      ],
      NOW,
    );
    expect(review).toMatchObject({ done: 2, total: 3 });
    expect(review.missed.map((task) => task.title)).toEqual(["Open one"]);
  });

  it("ignores other days, backlog tasks and tasks moved away from yesterday", () => {
    const review = yesterdayReview(
      [
        makeTask({ dueDate: due(26) }),
        makeTask({ dueDate: due(28) }),
        makeTask({ dueDate: null }),
        makeTask({ dueDate: due(28, 10), title: "Moved to today" }),
      ],
      NOW,
    );
    expect(review).toMatchObject({ done: 0, total: 0, missed: [] });
  });

  it("covers the whole local day, start to end", () => {
    const review = yesterdayReview(
      [makeTask({ dueDate: due(27, 0, 0) }), makeTask({ dueDate: due(27, 23, 59) })],
      NOW,
    );
    expect(review.total).toBe(2);
  });

  it("works across the DST change (Sun 25 Oct 2026)", () => {
    const monday = localDate(2026, 10, 26, 8);
    const review = yesterdayReview(
      [
        makeTask({ dueDate: due(25, 0, 30) }),
        makeTask({ dueDate: due(25, 2, 30) }),
        makeTask({ dueDate: due(25, 23, 30), status: "done" }),
        makeTask({ dueDate: due(24, 23, 30) }),
        makeTask({ dueDate: due(26, 0, 30) }),
      ],
      monday,
    );
    expect(review).toMatchObject({ done: 1, total: 3 });
  });

  it("sorts left-over tasks by priority, then due time, then title", () => {
    const review = yesterdayReview(
      [
        makeTask({ dueDate: due(27, 9), title: "B none" }),
        makeTask({ dueDate: due(27, 18), title: "High late", priority: "high" }),
        makeTask({ dueDate: due(27, 8), title: "High early", priority: "high" }),
        makeTask({ dueDate: due(27, 9), title: "A none" }),
        makeTask({ dueDate: due(27, 7), title: "Low", priority: "low" }),
      ],
      NOW,
    );
    expect(review.missed.map((task) => task.title)).toEqual([
      "High early",
      "High late",
      "Low",
      "A none",
      "B none",
    ]);
  });
});

describe("yesterdaySummary", () => {
  it("reads 'yesterday done/total', or nothing when nothing was due", () => {
    const day = previousLocalDay(NOW);
    expect(yesterdaySummary({ day, done: 4, total: 6, missed: [] })).toBe("yesterday 4/6");
    expect(yesterdaySummary({ day, done: 0, total: 0, missed: [] })).toBeNull();
  });
});
