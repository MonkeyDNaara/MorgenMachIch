import { describe, expect, it } from "vitest";
import { NewTaskSeriesSchema } from "@/lib/types";
import { parseQuickAdd } from "@/lib/utils/parseQuickAdd";
import { seriesFromQuickAdd } from "@/lib/utils/quickAddSeries";
import { localDate, makeLabel } from "@/lib/test/factories";

const labels = [makeLabel({ id: "h", name: "Health" })];
const WED = localDate(2026, 10, 7, 10);
const p = (text: string, recurrence = true) =>
  parseQuickAdd(text, { now: WED, labels, recurrence });

describe("seriesFromQuickAdd (#275)", () => {
  it("builds a valid series from a recurrence parse", () => {
    const s = seriesFromQuickAdd(p("Gym every monday 7am #health !high"))!;
    expect([
      s.title,
      s.priority,
      s.labelIds,
      s.recurrence.daysOfWeek,
      s.allDay,
      s.active,
      s.subtaskTemplate,
    ]).toEqual(["Gym", "high", ["h"], [1], false, true, []]);
    expect(new Date(s.startDate).getTime()).toBe(localDate(2026, 10, 12, 7).getTime());
    expect(NewTaskSeriesSchema.safeParse(s).success).toBe(true);
  });

  it("is all day without a time and defaults to no priority", () => {
    const s = seriesFromQuickAdd(p("Water plants daily"))!;
    expect([s.allDay, s.priority, new Date(s.startDate).getTime()]).toEqual([
      true,
      "none",
      localDate(2026, 10, 7).getTime(),
    ]);
  });

  it("returns null without a recurrence or without a title", () => {
    expect(seriesFromQuickAdd(p("Call fri"))).toBeNull();
    expect(seriesFromQuickAdd(p("every monday"))).toBeNull();
  });
});
