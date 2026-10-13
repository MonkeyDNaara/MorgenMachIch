import { describe, expect, it } from "vitest";
import type { Active, Over } from "@dnd-kit/core";
import { createDayAnnouncements, createListAnnouncements } from "@/lib/ui/dnd/announcements";
import { localDate } from "@/lib/test/factories";

/** Just the parts of dnd-kit's Active/Over the adapters read. */
const item = (id: string, index?: number, total = 4) =>
  ({
    id,
    data: { current: index === undefined ? {} : { sortable: { index, items: Array(total) } } },
  }) as unknown as Active & Over;

const titles: Record<string, string> = { a: "Call mom", b: "Pay rent" };
const titleOf = (id: string | number) => titles[id] ?? String(id);

describe("createListAnnouncements", () => {
  const say = createListAnnouncements(titleOf);

  it("uses the sortable index of the active item and of the item it is over", () => {
    expect(say.onDragStart({ active: item("a", 2) })).toBe(
      "Picked up “Call mom”. Now at position 3 of 4.",
    );
    expect(say.onDragOver({ active: item("a", 2), over: item("b", 0) })).toBe(
      "“Call mom” moved to position 1 of 4.",
    );
    expect(say.onDragEnd({ active: item("a", 2), over: item("b", 0) })).toBe(
      "Dropped “Call mom” at position 1 of 4.",
    );
    expect(say.onDragCancel({ active: item("a", 2), over: null })).toBe(
      "Cancelled. “Call mom” is back at position 3 of 4.",
    );
  });

  it("stays silent without a target or sortable data", () => {
    expect(say.onDragOver({ active: item("a", 2), over: null })).toBeUndefined();
    expect(say.onDragEnd({ active: item("a", 2), over: null })).toBeUndefined();
    expect(say.onDragStart({ active: item("a") })).toBeUndefined();
  });
});

describe("createDayAnnouncements", () => {
  const days: Record<string, { day: Date; allowed: boolean }> = {
    "day:2026-10-15": { day: localDate(2026, 10, 15), allowed: true },
    "day:2026-10-12": { day: localDate(2026, 10, 12), allowed: false },
  };
  const say = createDayAnnouncements(titleOf, (id) => days[id] ?? null);

  it("names the day it is over and the result of the drop", () => {
    expect(say.onDragStart({ active: item("a") })).toBe("Picked up “Call mom”. Choose a day.");
    expect(say.onDragOver({ active: item("a"), over: item("day:2026-10-15") })).toBe(
      "Over Thu 15 Oct.",
    );
    expect(say.onDragOver({ active: item("a"), over: item("day:2026-10-12") })).toBe(
      "Mon 12 Oct is in the past — can't drop here.",
    );
    expect(say.onDragEnd({ active: item("a"), over: item("day:2026-10-15") })).toBe(
      "Moved “Call mom” to Thu 15 Oct.",
    );
  });

  it("says nothing moved for a blocked day, no target or a non-day target", () => {
    expect(say.onDragEnd({ active: item("a"), over: item("day:2026-10-12") })).toBe(
      "“Call mom” wasn't moved.",
    );
    expect(say.onDragEnd({ active: item("b"), over: null })).toBe("“Pay rent” wasn't moved.");
    expect(say.onDragOver({ active: item("a"), over: item("tray") })).toBeUndefined();
    expect(say.onDragCancel({ active: item("a"), over: null })).toBe(
      "Cancelled. “Call mom” wasn't moved.",
    );
  });
});
