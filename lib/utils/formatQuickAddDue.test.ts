import { describe, expect, it } from "vitest";
import { formatQuickAddDue } from "@/lib/utils/formatQuickAddDue";
import { localDate, localIso } from "@/lib/test/factories";

const WED = localDate(2026, 10, 7, 10);

describe("formatQuickAddDue (quick-add hints and chips)", () => {
  it.each([
    [localIso(2026, 10, 7), true, "Today"],
    [localIso(2026, 10, 8, 9), false, "Tomorrow, 09:00"],
    [localIso(2026, 10, 9), true, "Fri 9 Oct"],
    [localIso(2026, 10, 9, 15), false, "Fri 9 Oct, 15:00"],
    [localIso(2027, 10, 5), true, "Tue 5 Oct 2027"],
  ])("%s (all day: %s) → %s", (iso, allDay, expected) => {
    expect(formatQuickAddDue(iso, allDay, WED)).toBe(expected);
  });
});
