import { describe, expect, it } from "vitest";
import { projectSeriesOccurrences } from "@/lib/utils/projectOccurrences";
import { dayKey, localDate, localIso, makeSeries, makeTask } from "@/lib/test/factories";

const TODAY = localDate(2026, 9, 30);
const series = (overrides = {}) => makeSeries({ id: "s1", ...overrides });
const occurrence = (dueDate: string, status: "open" | "done" | "skipped" = "open") =>
  makeTask({ seriesId: "s1", dueDate, allDay: true, status });
const ghostDays = (ghosts: { dueDate: string }[]) => ghosts.map((g) => dayKey(new Date(g.dueDate)));

describe("projectSeriesOccurrences (calendar ghosts, #168)", () => {
  it("projects today and later, never past days", () => {
    const ghosts = projectSeriesOccurrences(
      [series()],
      [],
      localDate(2026, 9, 28),
      localDate(2026, 10, 3),
      TODAY,
    );
    expect(ghostDays(ghosts)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  it("skips days that already have a real row — skipped ones included", () => {
    const tasks = [occurrence(localIso(2026, 10, 1)), occurrence(localIso(2026, 10, 2), "skipped")];
    const ghosts = projectSeriesOccurrences(
      [series()],
      tasks,
      TODAY,
      localDate(2026, 10, 3),
      TODAY,
    );
    expect(ghostDays(ghosts)).toEqual(["2026-09-30", "2026-10-03"]);
  });

  it("keeps paused series silent", () => {
    expect(
      projectSeriesOccurrences(
        [series({ active: false })],
        [],
        TODAY,
        localDate(2026, 10, 3),
        TODAY,
      ),
    ).toEqual([]);
  });

  it("respects a future start date", () => {
    const ghosts = projectSeriesOccurrences(
      [series({ startDate: localIso(2026, 10, 2) })],
      [],
      TODAY,
      localDate(2026, 10, 4),
      TODAY,
    );
    expect(ghostDays(ghosts)).toEqual(["2026-10-02", "2026-10-03", "2026-10-04"]);
  });

  it("respects the end date", () => {
    const ghosts = projectSeriesOccurrences(
      [series({ recurrence: { frequency: "daily", interval: 1, endDate: "2026-10-02" } })],
      [],
      TODAY,
      localDate(2026, 10, 5),
      TODAY,
    );
    expect(ghostDays(ghosts)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("projects far beyond the 60-day generation horizon", () => {
    expect(
      projectSeriesOccurrences(
        [series()],
        [],
        localDate(2026, 12, 1),
        localDate(2026, 12, 2),
        TODAY,
      ),
    ).toHaveLength(2);
  });

  it("returns nothing for a range fully in the past", () => {
    expect(
      projectSeriesOccurrences(
        [series()],
        [],
        localDate(2026, 8, 1),
        localDate(2026, 8, 31),
        TODAY,
      ),
    ).toEqual([]);
  });

  it("keeps the series' time of day", () => {
    const [ghost] = projectSeriesOccurrences(
      [series({ allDay: false, startDate: localIso(2026, 9, 1, 9, 30) })],
      [],
      localDate(2026, 12, 1),
      localDate(2026, 12, 1),
      TODAY,
    );
    const due = new Date(ghost.dueDate);
    expect([due.getHours(), due.getMinutes()]).toEqual([9, 30]);
  });

  it("follows a weekly rule", () => {
    const ghosts = projectSeriesOccurrences(
      [series({ recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1] } })],
      [],
      localDate(2026, 12, 1),
      localDate(2026, 12, 31),
      TODAY,
    );
    expect(ghostDays(ghosts)).toEqual(["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"]);
  });

  it("carries the series' labels and priority (filters apply to ghosts, #171)", () => {
    const ghosts = projectSeriesOccurrences(
      [series({ labelIds: ["work"], priority: "high" })],
      [],
      localDate(2027, 1, 1),
      localDate(2027, 1, 2),
      TODAY,
    );
    expect(ghosts.map((g) => [g.labelIds, g.priority])).toEqual([
      [["work"], "high"],
      [["work"], "high"],
    ]);
  });
});
