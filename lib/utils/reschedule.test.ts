import { describe, expect, it } from "vitest";
import {
  canReschedule,
  dragTaskId,
  dropDayId,
  isDropDay,
  isOnDay,
  moveToDay,
  parseDragTaskId,
  parseDropDayId,
} from "@/lib/utils/reschedule";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

describe("canReschedule (#74)", () => {
  it("allows open standalone tasks, dated or not", () => {
    expect(canReschedule(makeTask())).toBe(true);
    expect(canReschedule(makeTask({ dueDate: null }))).toBe(true);
  });

  it.each([
    ["done", { status: "done" as const }],
    ["skipped", { status: "skipped" as const }],
    ["a recurring occurrence", { seriesId: "s1" }],
  ])("refuses %s tasks", (_name, overrides) => {
    expect(canReschedule(makeTask(overrides))).toBe(false);
  });
});

describe("isDropDay", () => {
  const NOW = localDate(2026, 10, 13, 23, 50);

  it("accepts today (even late) and later days", () => {
    expect(isDropDay(localDate(2026, 10, 13), NOW)).toBe(true);
    expect(isDropDay(localDate(2026, 10, 13, 0, 0), localDate(2026, 10, 13, 0, 1))).toBe(true);
    expect(isDropDay(localDate(2026, 10, 14), NOW)).toBe(true);
    expect(isDropDay(localDate(2027, 1, 1), NOW)).toBe(true);
  });

  it("refuses past days", () => {
    expect(isDropDay(localDate(2026, 10, 12, 23, 59), NOW)).toBe(false);
    expect(isDropDay(localDate(2025, 12, 31), NOW)).toBe(false);
  });
});

describe("moveToDay", () => {
  it("keeps the time of a timed task", () => {
    expect(moveToDay(localIso(2026, 10, 13, 15), false, localDate(2026, 10, 15))).toBe(
      localIso(2026, 10, 15, 15),
    );
    expect(moveToDay(localIso(2026, 10, 13, 9, 30), false, localDate(2026, 10, 2))).toBe(
      localIso(2026, 10, 2, 9, 30),
    );
  });

  it("keeps all-day tasks at local midnight", () => {
    expect(moveToDay(localIso(2026, 10, 13), true, localDate(2026, 10, 20, 14))).toBe(
      localIso(2026, 10, 20),
    );
  });

  it("crosses month and year ends", () => {
    expect(moveToDay(localIso(2026, 10, 31, 18), false, localDate(2026, 11, 1))).toBe(
      localIso(2026, 11, 1, 18),
    );
    expect(moveToDay(localIso(2026, 12, 31), true, localDate(2027, 1, 1))).toBe(
      localIso(2027, 1, 1),
    );
  });

  it("keeps the time across the EU and US DST changes", () => {
    // EU ends Sun 25 Oct 2026, US Sun 1 Nov 2026, EU starts Sun 29 Mar 2026.
    expect(moveToDay(localIso(2026, 10, 24, 9), false, localDate(2026, 10, 26))).toBe(
      localIso(2026, 10, 26, 9),
    );
    expect(moveToDay(localIso(2026, 10, 31, 8, 15), false, localDate(2026, 11, 2))).toBe(
      localIso(2026, 11, 2, 8, 15),
    );
    expect(moveToDay(localIso(2026, 3, 28, 23), false, localDate(2026, 3, 30))).toBe(
      localIso(2026, 3, 30, 23),
    );
    expect(moveToDay(localIso(2026, 10, 24), true, localDate(2026, 10, 25))).toBe(
      localIso(2026, 10, 25),
    );
  });
});

describe("isOnDay", () => {
  it("compares local days", () => {
    expect(isOnDay(localIso(2026, 10, 15, 23, 59), localDate(2026, 10, 15))).toBe(true);
    expect(isOnDay(localIso(2026, 10, 15), localDate(2026, 10, 15, 12))).toBe(true);
    expect(isOnDay(localIso(2026, 10, 16, 0, 1), localDate(2026, 10, 15))).toBe(false);
  });
});

describe("drop and drag ids", () => {
  it("round-trips a local day", () => {
    const day = localDate(2026, 10, 25);
    expect(dropDayId(day)).toBe("day:2026-10-25");
    expect(parseDropDayId(dropDayId(day))).toEqual(day);
    expect(parseDropDayId("day:2027-01-01")).toEqual(localDate(2027, 1, 1));
  });

  it("returns null for other ids", () => {
    expect(parseDropDayId("task:abc")).toBeNull();
    expect(parseDropDayId("day:soon")).toBeNull();
    expect(parseDropDayId(42)).toBeNull();
  });

  it("prefixes task ids", () => {
    expect(dragTaskId("abc")).toBe("task:abc");
    expect(parseDragTaskId("task:abc")).toBe("abc");
    expect(parseDragTaskId("day:2026-10-15")).toBeNull();
  });
});
