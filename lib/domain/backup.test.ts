import { describe, expect, it } from "vitest";
import {
  BACKUP_VERSION,
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
} from "@/lib/domain/backup";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";
import { localDate } from "@/lib/test/factories";
import type { Task } from "@/lib/types";

const NOW = "2026-09-30T10:00:00.000Z";
const label = { id: "l1", name: "Work", color: LABEL_COLOR_HEXES[0], createdAt: NOW };
const series = {
  id: "s1",
  title: "Water plants",
  priority: "low" as const,
  labelIds: ["l1"],
  subtaskTemplate: [],
  recurrence: { frequency: "daily" as const, interval: 1 },
  startDate: NOW,
  allDay: true,
  active: true,
  createdAt: NOW,
  updatedAt: NOW,
};
const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Do it",
  status: "open",
  priority: "none",
  dueDate: NOW,
  allDay: false,
  labelIds: ["l1"],
  subtasks: [],
  seriesId: null,
  createdAt: NOW,
  updatedAt: NOW,
  completedAt: null,
  sortOrder: null,
  ...overrides,
});
const settings = { id: "app" as const, statsSince: null };
const good = {
  tasks: [task(), task({ id: "t2", seriesId: "s1" })],
  taskSeries: [series],
  labels: [label],
};

/** A backup file as text. `data` and the envelope fields can be anything — that's the point. */
const file = (data: unknown, envelope: Record<string, unknown> = {}) =>
  JSON.stringify({ app: "morgenmachich", version: 3, exportedAt: NOW, data, ...envelope });
const errorsOf = (text: string) => {
  const result = parseBackup(text);
  if (result.ok) throw new Error("expected the backup to be rejected");
  return result.errors;
};

describe("buildBackup / serializeBackup / parseBackup", () => {
  it("round-trips a full backup, settings included", () => {
    const withSettings = {
      ...good,
      settings: { id: "app" as const, statsSince: "2026-10-08T22:00:00.000Z" },
    };
    const result = parseBackup(serializeBackup(buildBackup(withSettings, new Date(NOW))));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.version).toBe(BACKUP_VERSION);
    expect(result.backup.data.tasks).toHaveLength(2);
    expect(result.backup.data.labels).toHaveLength(1);
    expect(result.backup.data.settings).toEqual(withSettings.settings);
  });

  it("accepts a valid file and empty collections", () => {
    expect(parseBackup(file({ ...good, settings })).ok).toBe(true);
    expect(parseBackup(file({ tasks: [], taskSeries: [], labels: [], settings })).ok).toBe(true);
  });
});

describe("parseBackup — versions (#226)", () => {
  it("fills default settings for a v1 file and ignores stray settings there", () => {
    const v1 = parseBackup(file(good, { version: 1 }));
    expect(v1.ok && v1.backup.data.settings).toEqual({ id: "app", statsSince: null });
    expect(parseBackup(file({ ...good, settings: { id: "nope" } }, { version: 1 })).ok).toBe(true);
  });

  it("requires valid settings in a v2 and v3 file", () => {
    expect(errorsOf(file(good, { version: 2 }))[0]).toContain("settings");
    expect(errorsOf(file(good))[0]).toContain("settings");
    expect(parseBackup(file({ ...good, settings: { id: "app", statsSince: 5 } })).ok).toBe(false);
  });

  it("imports v1 and v2 tasks without sortOrder as null (#75)", () => {
    const withoutOrder: Record<string, unknown> = task({ dueDate: null });
    delete withoutOrder.sortOrder;
    for (const [version, extra] of [
      [1, {}],
      [2, { settings }],
    ] as const) {
      const result = parseBackup(file({ ...good, ...extra, tasks: [withoutOrder] }, { version }));
      expect(result.ok && result.backup.data.tasks[0].sortOrder).toBeNull();
    }
  });

  it("keeps sortOrder from a v3 file and rejects a broken key", () => {
    const keyed = file({ ...good, settings, tasks: [task({ sortOrder: "V" })] });
    const result = parseBackup(keyed);
    expect(result.ok && result.backup.data.tasks[0].sortOrder).toBe("V");
    const broken = file({ ...good, settings, tasks: [task({ sortOrder: "V0" })] });
    expect(errorsOf(broken)[0]).toContain("sortOrder");
  });

  it("rejects newer and invalid versions", () => {
    expect(errorsOf(file({ ...good, settings }, { version: 4 }))[0]).toContain("newer version");
    expect(errorsOf(file(good, { version: 0 })).join()).toContain("format version");
    expect(errorsOf(file(good, { version: "1" })).join()).toContain("format version");
  });
});

describe("parseBackup — envelope", () => {
  it.each([
    ["invalid JSON", "{nope", "isn't valid JSON"],
    ["an array root", "[]", "doesn't look like"],
    ["another app", file(good, { app: "other" }), "doesn't look like"],
    ["a missing export date", file(good, { exportedAt: undefined }), "export date"],
    ["missing lists", file({ tasks: [] }), "missing its tasks"],
  ])("rejects %s", (_name, text, message) => {
    expect(errorsOf(text).join("\n")).toContain(message);
  });
});

describe("parseBackup — rows and references", () => {
  const data = (overrides: Record<string, unknown>) => file({ ...good, settings, ...overrides });

  it.each([
    [
      "an invalid row (named by position)",
      { tasks: [task({ status: "weird" as Task["status"] })] },
      "Task #1",
    ],
    ["the failing field", { tasks: [task({ priority: "x" as Task["priority"] })] }, "priority"],
    ["duplicate ids", { tasks: [task(), task()] }, "duplicate id"],
    [
      "a missing label",
      { tasks: [task({ labelIds: ["nope"] })] },
      "label(s) that aren't in the file",
    ],
    ["a missing series", { tasks: [task({ seriesId: "nope" })] }, "series that isn't in the file"],
    [
      "a series with a missing label",
      { taskSeries: [{ ...series, labelIds: ["nope"] }] },
      'Series "Water plants"',
    ],
    ["an unknown label color", { labels: [{ ...label, color: "#123456" }] }, "Label #1"],
  ])("reports %s", (_name, overrides, message) => {
    expect(errorsOf(data(overrides)).join("\n")).toContain(message);
  });

  it("caps the list at 20 errors plus a summary", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      task({ id: `x${i}`, status: "weird" as Task["status"] }),
    );
    const errors = errorsOf(data({ tasks: many }));
    expect(errors).toHaveLength(21);
    expect(errors[20]).toContain("10 more");
  });
});

describe("backupFileName", () => {
  it("uses the local date and an optional label", () => {
    expect(backupFileName(localDate(2026, 9, 5))).toBe("morgenmachich-backup-2026-09-05.json");
    expect(backupFileName(localDate(2026, 9, 5), "before-import")).toBe(
      "morgenmachich-backup-before-import-2026-09-05.json",
    );
  });
});
