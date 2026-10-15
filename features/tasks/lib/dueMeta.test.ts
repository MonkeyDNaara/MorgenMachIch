import { describe, expect, it } from "vitest";
import { dueMeta } from "@/features/tasks/lib/dueMeta";
import { isOverdue } from "@/features/tasks/lib/formatDueDate";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

const NOW = localDate(2026, 10, 9, 10); // Fri 9 Oct 10:00
const task = (overrides = {}) => makeTask({ dueDate: localIso(2026, 10, 9, 15), ...overrides });

describe("isOverdue (#237 all-day fix)", () => {
  it("an all-day task is not overdue on its own day", () => {
    expect(isOverdue(localIso(2026, 10, 9), true, NOW)).toBe(false);
    expect(isOverdue(localIso(2026, 10, 8), true, NOW)).toBe(true);
  });

  it("a timed task is overdue once its time has passed", () => {
    expect(isOverdue(localIso(2026, 10, 9, 9), false, NOW)).toBe(true);
    expect(isOverdue(localIso(2026, 10, 9, 11), false, NOW)).toBe(false);
  });
});

describe("dueMeta (task card meta line)", () => {
  it.each([
    ["today, timed", {}, { text: "15:00", tone: "accent" }],
    [
      "today, all day",
      { dueDate: localIso(2026, 10, 9), allDay: true },
      { text: "Today", tone: "accent" },
    ],
    ["today, done", { status: "done" }, { text: "15:00", tone: "muted" }],
    ["today, skipped", { status: "skipped" }, { text: "15:00 · skipped", tone: "muted" }],
    [
      "earlier today",
      { dueDate: localIso(2026, 10, 9, 9) },
      { text: "09:00 · overdue", tone: "error" },
    ],
    [
      "2 days late",
      { dueDate: localIso(2026, 10, 7, 9) },
      { text: "Wed 7 Oct · 2 days late", tone: "error" },
    ],
    [
      "all day yesterday",
      { dueDate: localIso(2026, 10, 8), allDay: true },
      { text: "Thu 8 Oct · 1 day late", tone: "error" },
    ],
    [
      "done in the past",
      { dueDate: localIso(2026, 10, 7, 9), status: "done" },
      { text: "7 Oct, 09:00", tone: "muted" },
    ],
    [
      "tomorrow, timed",
      { dueDate: localIso(2026, 10, 10, 9) },
      { text: "Tomorrow, 09:00", tone: "muted" },
    ],
    [
      "tomorrow, all day",
      { dueDate: localIso(2026, 10, 10), allDay: true },
      { text: "Tomorrow", tone: "muted" },
    ],
    ["later", { dueDate: localIso(2026, 10, 20, 14) }, { text: "20 Oct, 14:00", tone: "muted" }],
    [
      "late across a month end (en-GB 'Sept')",
      { dueDate: localIso(2026, 9, 30, 23, 30) },
      { text: "Wed 30 Sept · 9 days late", tone: "error" },
    ],
  ] as const)("%s", (_name, overrides, expected) => {
    expect(dueMeta(task(overrides), NOW)).toEqual(expected);
  });

  it("returns null for a backlog task", () => {
    expect(dueMeta(task({ dueDate: null }), NOW)).toBeNull();
  });
});
