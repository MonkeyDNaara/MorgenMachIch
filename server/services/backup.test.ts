import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSampleData } from "@/features/demo/lib/buildSampleData";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";
import { BACKUP_APP_NAME, parseBackup, type BackupData } from "@/lib/domain/backup";
import { makeLabel, makeSeries, makeTask } from "@/lib/test/factories";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";
import { appSettings, tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { backupServices } from "@/server/services/backup";
import { ValidationError } from "@/server/services/errors";
import { labelServices } from "@/server/services/labels";
import { settingsServices } from "@/server/services/settings";
import { taskServices } from "@/server/services/tasks";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;
let userId: string;
let backup: ReturnType<typeof backupServices>;
let taskApi: ReturnType<typeof taskServices>;

/** The browser and the settings share one zone — like a real user (#309). */
const runtimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const now = new Date();

async function newUser(name = "Me") {
  const id = await createTestUser(db, name);
  const ctx = { db, userId: id, source: "ui" as const };
  await settingsServices(ctx).updateSettings({ timeZone: runtimeZone });
  return { id, ctx, backup: backupServices(ctx), tasks: taskServices(ctx) };
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

beforeEach(async () => {
  const user = await newUser();
  ({ id: userId, backup, tasks: taskApi } = user);
});

/**
 * Ids change on import, so data is compared by content: labels by name, series by title
 * and start, tasks with their label names and series title instead of ids.
 */
function normalize(data: BackupData) {
  const without = <T extends object, K extends keyof T>(item: T, ...keys: K[]) => {
    const copy = { ...item };
    for (const key of keys) delete copy[key];
    return copy as Omit<T, K>;
  };
  const labelName = new Map(data.labels.map((l) => [l.id, l.name]));
  const seriesKey = new Map(data.taskSeries.map((s) => [s.id, `${s.title}|${s.startDate}`]));
  /** JSON with sorted keys, so property order (mapper vs. sample builder) doesn't matter. */
  const sortKeys = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sortKeys)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => (a < b ? -1 : 1))
              .map(([k, v]) => [k, sortKeys(v)]),
          )
        : value;
  const sortJson = <T>(items: T[]) => items.map((i) => JSON.stringify(sortKeys(i))).sort();
  return {
    labels: sortJson(data.labels.map((label) => without(label, "id"))),
    taskSeries: sortJson(
      data.taskSeries.map((series) => ({
        ...without(series, "id", "updatedAt"),
        labelIds: series.labelIds.map((id) => labelName.get(id)).sort(),
      })),
    ),
    tasks: sortJson(
      data.tasks.map((task) => ({
        ...without(task, "id"),
        labelIds: task.labelIds.map((id) => labelName.get(id)).sort(),
        seriesId: task.seriesId && seriesKey.get(task.seriesId),
        subtasks: task.subtasks.map((subtask) => without(subtask, "id")),
      })),
    ),
    statsSince: data.settings.statsSince,
  };
}

const sample = (): BackupData => ({
  ...buildSampleData(now),
  settings: { ...DEFAULT_APP_SETTINGS, statsSince: "2026-09-01T00:00:00.000Z" },
});

describe("importAll / exportAll", () => {
  it("round-trips the demo data without loss", async () => {
    const data = sample();
    await backup.importAll(data, now);
    const exported = await backup.exportAll();
    expect(normalize(exported)).toEqual(normalize(data));
    expect(await backup.getDataCounts()).toEqual({
      tasks: data.tasks.length,
      taskSeries: data.taskSeries.length,
      labels: data.labels.length,
    });
  });

  it("gives every row a fresh id, so two users can import the same file", async () => {
    const data = sample();
    await backup.importAll(data, now);
    const second = await newUser("Second");
    await second.backup.importAll(data, now);

    const mine = await backup.exportAll();
    const theirs = await second.backup.exportAll();
    expect(normalize(theirs)).toEqual(normalize(mine));
    const myIds = new Set(mine.tasks.map((t) => t.id));
    expect(theirs.tasks.some((t) => myIds.has(t.id))).toBe(false);
    expect(mine.tasks.some((t) => data.tasks[0].id === t.id)).toBe(false);
  });

  it("imports a v1 file (no settings, no sortOrder) with ids that aren't uuids", async () => {
    const label = makeLabel({ id: "l1", name: "Work", color: LABEL_COLOR_HEXES[2] });
    const task = makeTask({ id: "t1", title: "Old", labelIds: ["l1"], dueDate: null });
    const v1 = JSON.stringify({
      app: BACKUP_APP_NAME,
      version: 1,
      exportedAt: now.toISOString(),
      data: { tasks: [{ ...task, sortOrder: undefined }], taskSeries: [], labels: [label] },
    });
    const parsed = parseBackup(v1);
    if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
    await backup.importAll(parsed.backup.data, now);

    const [imported] = await taskApi.getTasks();
    expect(imported).toMatchObject({ title: "Old", sortOrder: null });
    const [importedLabel] = await labelServices({ db, userId, source: "ui" }).getLabels();
    expect(imported.labelIds).toEqual([importedLabel.id]);
    const [row] = await db.select().from(tasks).where(eq(tasks.id, imported.id));
    expect(row.source).toBe("import");
  });

  it("keeps one occurrence per series and day, the others become standalone tasks", async () => {
    const series = makeSeries({ id: "s1", active: false });
    const dueDate = "2026-10-20T10:00:00.000Z";
    const data: BackupData = {
      labels: [],
      taskSeries: [series],
      tasks: [
        makeTask({ id: "a", title: "open twin", seriesId: "s1", dueDate }),
        makeTask({
          id: "b",
          title: "done twin",
          seriesId: "s1",
          dueDate,
          status: "done",
          completedAt: dueDate,
        }),
        makeTask({ id: "c", title: "no date", seriesId: "s1", dueDate: null }),
      ],
      settings: DEFAULT_APP_SETTINGS,
    };
    await backup.importAll(data, now);
    const byTitle = new Map((await taskApi.getTasks()).map((t) => [t.title, t]));
    expect(byTitle.get("done twin")?.seriesId).not.toBeNull();
    expect(byTitle.get("done twin")?.completedAt).toBe(dueDate);
    expect(byTitle.get("open twin")?.seriesId).toBeNull();
    expect(byTitle.get("no date")?.seriesId).toBeNull();
  });

  it("replaces everything, tombstones included, and keeps the time zone", async () => {
    await backup.importAll(sample(), now);
    const [first] = await taskApi.getTasks();
    await taskApi.deleteTask(first.id);
    const small: BackupData = {
      labels: [],
      taskSeries: [],
      tasks: [makeTask({ id: "x", title: "Only one" })],
      settings: DEFAULT_APP_SETTINGS,
    };
    await backup.importAll(small, now);
    expect((await taskApi.getTasks()).map((t) => t.title)).toEqual(["Only one"]);
    expect(await db.select().from(tasks).where(eq(tasks.userId, userId))).toHaveLength(1);
    const [settings] = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    expect(settings).toMatchObject({ timeZone: runtimeZone, statsSince: null });
  });

  it("leaves the old data untouched when the import fails", async () => {
    await backup.importAll(sample(), now);
    const before = await backup.exportAll();

    const broken: BackupData = {
      ...sample(),
      tasks: [makeTask({ id: "t", labelIds: ["missing-label"] })],
    };
    await expect(backup.importAll(broken, now)).rejects.toBeInstanceOf(ValidationError);

    // A failure inside the transaction (after the wipe) rolls back too.
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tooLong = { ...sample() };
    tooLong.tasks = [...tooLong.tasks, { ...tooLong.tasks[0], id: tooLong.tasks[1].id }];
    await expect(backup.importAll(tooLong, now)).rejects.toThrow();
    spy.mockRestore();

    expect(normalize(await backup.exportAll())).toEqual(normalize(before));
  });

  it("never touches another user's data", async () => {
    const other = await newUser("Other");
    await other.backup.importAll(sample(), now);
    const theirs = await other.backup.exportAll();
    await backup.importAll(sample(), now);
    await backup.deleteAllData();
    expect(normalize(await other.backup.exportAll())).toEqual(normalize(theirs));
  });

  it("needs a saved time zone", async () => {
    const id = await createTestUser(db);
    const noZone = backupServices({ db, userId: id, source: "ui" });
    await expect(noZone.importAll(sample(), now)).rejects.toMatchObject({
      issues: [{ path: "timeZone" }],
    });
  });
});

describe("deleteAllData", () => {
  it("hard-deletes everything, resets the stats start, keeps the time zone", async () => {
    await backup.importAll(sample(), now);
    await backup.deleteAllData();
    expect(await backup.getDataCounts()).toEqual({ tasks: 0, taskSeries: 0, labels: 0 });
    expect(await db.select().from(tasks).where(eq(tasks.userId, userId))).toEqual([]);
    const [settings] = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    expect(settings).toMatchObject({
      timeZone: runtimeZone,
      statsSince: null,
      occurrencesGeneratedOn: null,
    });
  });
});
