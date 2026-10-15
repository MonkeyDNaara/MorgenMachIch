import { describe, expect, it } from "vitest";
import {
  dayAnnouncement,
  formatDropDay,
  LIST_DRAG_INSTRUCTIONS,
  listAnnouncement,
} from "@/features/dnd/lib/dndAnnouncements";
import { localDate } from "@/lib/test/factories";

describe("formatDropDay", () => {
  it.each([
    [localDate(2026, 10, 15), "Thu 15 Oct"],
    [localDate(2026, 9, 1), "Tue 1 Sept"],
    [localDate(2027, 1, 1), "Fri 1 Jan"],
    [localDate(2026, 3, 29), "Sun 29 Mar"], // EU DST start
    [localDate(2026, 11, 1), "Sun 1 Nov"], // US DST end
  ])("%s → %s (no comma, local day)", (day, expected) => {
    expect(formatDropDay(day)).toBe(expected);
  });
});

describe("listAnnouncement", () => {
  it("counts positions from 1", () => {
    expect(listAnnouncement.pickedUp("Call mom", 2, 7)).toBe(
      "Picked up “Call mom”. Now at position 3 of 7.",
    );
    expect(listAnnouncement.movedTo("Call mom", 0, 7)).toBe("“Call mom” moved to position 1 of 7.");
    expect(listAnnouncement.dropped("Call mom", 6, 7)).toBe(
      "Dropped “Call mom” at position 7 of 7.",
    );
    expect(listAnnouncement.cancelled("Call mom", 2, 7)).toBe(
      "Cancelled. “Call mom” is back at position 3 of 7.",
    );
  });
});

describe("dayAnnouncement", () => {
  const thu = localDate(2026, 10, 15);

  it("names the day and says when a drop isn't allowed", () => {
    expect(dayAnnouncement.pickedUp("Call mom")).toBe("Picked up “Call mom”. Choose a day.");
    expect(dayAnnouncement.over(thu, true)).toBe("Over Thu 15 Oct.");
    expect(dayAnnouncement.over(thu, false)).toBe("Thu 15 Oct is in the past — can't drop here.");
    expect(dayAnnouncement.dropped("Call mom", thu)).toBe("Moved “Call mom” to Thu 15 Oct.");
    expect(dayAnnouncement.notMoved("Call mom")).toBe("“Call mom” wasn't moved.");
    expect(dayAnnouncement.cancelled("Call mom")).toBe("Cancelled. “Call mom” wasn't moved.");
  });
});

describe("instructions", () => {
  it("mention every key", () => {
    for (const key of ["Space", "Enter", "arrow", "Escape"]) {
      expect(LIST_DRAG_INSTRUCTIONS).toContain(key);
    }
  });
});
