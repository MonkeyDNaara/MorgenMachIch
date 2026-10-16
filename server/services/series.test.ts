import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";
import type { NewTaskSeries } from "@/lib/types";
import { tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/services/errors";
import { labelServices } from "@/server/services/labels";
import { seriesServices } from "@/server/services/series";
import { settingsServices } from "@/server/services/settings";
import { taskServices } from "@/server/services/tasks";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;
let userId: string;
let series: ReturnType<typeof seriesServices>;
let taskApi: ReturnType<typeof taskServices>;
let labelApi: ReturnType<typeof labelServices>;
let other: ReturnType<typeof seriesServices>;
const [RED, BLUE] = LABEL_COLOR_HEXES;

// Sat 17 Oct 2026, 00:30 in Berlin (still the 16th in UTC).
const now = new Date("2026-10-16T22:30:00Z");
const DAILY_8AM: NewTaskSeries = {
  title: "Stretch",
  priority: "none",
  labelIds: [],
  subtaskTemplate: [],
  recurrence: { frequency: "daily", interval: 1 },
  startDate: "2026-10-01T06:00:00.000Z", // 08:00 Berlin
  allDay: false,
  active: true,
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

beforeEach(async () => {
  userId = await createTestUser(db, "Me");
  const ctx = { db, userId, source: "ui" as const };
  series = seriesServices(ctx);
  taskApi = taskServices(ctx);
  labelApi = labelServices(ctx);
  await settingsServices(ctx).updateSettings({ timeZone: "Europe/Berlin" });
  const otherCtx = { db, userId: await createTestUser(db, "Other"), source: "ui" as const };
  await settingsServices(otherCtx).updateSettings({ timeZone: "Europe/Berlin" });
  other = seriesServices(otherCtx);
});

/** All occurrence rows of a series, deleted ones included, by date. */
const rowsOf = (seriesId: string) =>
  db.select().from(tasks).where(eq(tasks.seriesId, seriesId)).orderBy(tasks.occurrenceDate);
const liveRowsOf = async (seriesId: string) =>
  (await rowsOf(seriesId)).filter((row) => row.deletedAt === null);
const rowOn = async (seriesId: string, day: string) =>
  (
    await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.seriesId, seriesId), eq(tasks.occurrenceDate, day)))
  )[0];

describe("create and read", () => {
  it("creates the series with its occurrences in one go", async () => {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    expect(created).toMatchObject({ title: "Stretch", active: true });
    expect(await series.getTaskSeries(created.id)).toEqual(created);
    expect(await series.listTaskSeries()).toEqual([created]);
    const rows = await liveRowsOf(created.id);
    expect(rows).toHaveLength(61);
    expect(rows[0]).toMatchObject({ occurrenceDate: "2026-10-17" });
    expect(series.createTaskSeriesWithOccurrences).toBe(series.createTaskSeries);
  });

  it("validates input, labels and the time zone", async () => {
    await expect(series.createTaskSeries({ ...DAILY_8AM, title: "" }, now)).rejects.toBeInstanceOf(
      ValidationError,
    );
    const foreign = await labelServices({
      db,
      userId: await createTestUser(db),
      source: "ui",
    }).createLabel({ name: "Theirs", color: RED });
    await expect(
      series.createTaskSeries({ ...DAILY_8AM, labelIds: [foreign.id] }, now),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const noZone = seriesServices({ db, userId: await createTestUser(db), source: "ui" });
    await expect(noZone.createTaskSeries(DAILY_8AM, now)).rejects.toMatchObject({
      issues: [{ path: "timeZone" }],
    });
  });

  it("keeps users apart", async () => {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    expect(await other.getTaskSeries(created.id)).toBeUndefined();
    expect(await other.listTaskSeries()).toEqual([]);
    await expect(other.updateTaskSeries(created.id, { title: "X" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(other.deleteTaskSeriesAndOccurrences(created.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await other.countSeriesOccurrences(created.id, now)).toEqual({ upcoming: 0, total: 0 });
  });
});

describe("updateTaskSeries (pause/resume)", () => {
  it("pausing keeps existing occurrences, resuming tops up right away", async () => {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    const [first] = await liveRowsOf(created.id);
    await db.delete(tasks).where(eq(tasks.id, first.id)); // a free slot to refill

    await series.updateTaskSeries(created.id, { active: false }, now);
    expect(await liveRowsOf(created.id)).toHaveLength(60);
    await series.updateTaskSeries(created.id, { active: true }, now);
    expect(await liveRowsOf(created.id)).toHaveLength(61);
  });
});

describe("updateTaskSeriesAndRegenerate", () => {
  it("updates upcoming occurrences in place and keeps their ids", async () => {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    const before = await liveRowsOf(created.id);
    await series.updateTaskSeriesAndRegenerate(
      created.id,
      { title: "Yoga", startDate: "2026-10-01T05:00:00.000Z" }, // 07:00 Berlin
      now,
    );
    const after = await liveRowsOf(created.id);
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
    expect(after[0]).toMatchObject({ title: "Yoga", dueDate: new Date("2026-10-17T05:00:00Z") });
  });

  it("keeps checked subtasks unless the template changes", async () => {
    const created = await series.createTaskSeries(
      { ...DAILY_8AM, subtaskTemplate: [{ title: "Neck" }] },
      now,
    );
    const [first] = await liveRowsOf(created.id);
    const task = (await taskApi.getTask(first.id))!;
    await taskApi.updateTask(task.id, { subtasks: [{ ...task.subtasks[0], done: true }] });

    await series.updateTaskSeriesAndRegenerate(created.id, { title: "Renamed" }, now);
    expect((await taskApi.getTask(first.id))!.subtasks[0].done).toBe(true);

    await series.updateTaskSeriesAndRegenerate(
      created.id,
      { subtaskTemplate: [{ title: "Neck" }, { title: "Back" }] },
      now,
    );
    expect((await taskApi.getTask(first.id))!.subtasks).toMatchObject([
      { title: "Neck", done: false },
      { title: "Back", done: false },
    ]);
  });

  it("replaces occurrence labels when the series labels change", async () => {
    const home = await labelApi.createLabel({ name: "Home", color: RED });
    const work = await labelApi.createLabel({ name: "Work", color: BLUE });
    const created = await series.createTaskSeries({ ...DAILY_8AM, labelIds: [home.id] }, now);
    const [first] = await liveRowsOf(created.id);
    expect((await taskApi.getTask(first.id))!.labelIds).toEqual([home.id]);
    await series.updateTaskSeriesAndRegenerate(created.id, { labelIds: [work.id] }, now);
    expect((await taskApi.getTask(first.id))!.labelIds).toEqual([work.id]);
  });

  it("soft-deletes dates the new rule drops and restores them when it comes back", async () => {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    const saturday = await rowOn(created.id, "2026-10-17");

    await series.updateTaskSeriesAndRegenerate(
      created.id,
      { recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1, 2, 3, 4, 5] } },
      now,
    );
    expect((await rowOn(created.id, "2026-10-17")).deletedAt).not.toBeNull();
    expect((await rowOn(created.id, "2026-10-19")).deletedAt).toBeNull(); // Monday

    await series.updateTaskSeriesAndRegenerate(
      created.id,
      { recurrence: { frequency: "daily", interval: 1 } },
      now,
    );
    const back = await rowOn(created.id, "2026-10-17");
    expect(back.id).toBe(saturday.id);
    expect(back.deletedAt).toBeNull();
    expect(await liveRowsOf(created.id)).toHaveLength(61);
  });

  it("never touches done, skipped or past occurrences", async () => {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    const [first, second] = await liveRowsOf(created.id);
    await taskApi.updateTask(first.id, { status: "done" });
    await taskApi.updateTask(second.id, { status: "skipped" });
    // A past occurrence, generated before "today".
    const past = crypto.randomUUID();
    await db.insert(tasks).values({
      id: past,
      userId,
      seriesId: created.id,
      title: "Stretch",
      dueDate: new Date("2026-10-10T06:00:00Z"),
      occurrenceDate: "2026-10-10",
    });

    await series.updateTaskSeriesAndRegenerate(created.id, { title: "Changed" }, now);
    const rows = await rowsOf(created.id);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(first.id)).toMatchObject({ title: "Stretch", status: "done" });
    expect(byId.get(second.id)).toMatchObject({ title: "Stretch", status: "skipped" });
    expect(byId.get(past)).toMatchObject({ title: "Stretch", deletedAt: null });
  });

  it("doesn't let getTasks bring back a single deleted occurrence", async () => {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    const [first] = await liveRowsOf(created.id);
    await taskApi.deleteTask(first.id);
    await taskApi.getTasks();
    expect((await rowOn(created.id, "2026-10-17")).deletedAt).not.toBeNull();
  });
});

describe("counting and deleting (#148)", () => {
  async function seriesWithHistory() {
    const created = await series.createTaskSeries(DAILY_8AM, now);
    const [first] = await liveRowsOf(created.id);
    await taskApi.updateTask(first.id, { status: "done" });
    return { created, done: first };
  }

  it("counts upcoming open and all occurrences", async () => {
    const { created } = await seriesWithHistory();
    expect(await series.countSeriesOccurrences(created.id, now)).toEqual({
      upcoming: 60,
      total: 61,
    });
  });

  it("keeping tasks detaches every occurrence", async () => {
    const { created } = await seriesWithHistory();
    await series.deleteTaskSeriesKeepingTasks(created.id);
    expect(await series.getTaskSeries(created.id)).toBeUndefined();
    expect(await rowsOf(created.id)).toEqual([]);
    expect((await taskApi.getTasks()).filter((t) => t.seriesId === null)).toHaveLength(61);
  });

  it("+ upcoming soft-deletes the open future ones and detaches the history", async () => {
    const { created, done } = await seriesWithHistory();
    await series.deleteTaskSeriesAndUpcoming(created.id, now);
    const remaining = await taskApi.getTasks();
    expect(remaining.map((t) => t.id)).toEqual([done.id]);
    expect(remaining[0].seriesId).toBeNull();
  });

  it("+ all soft-deletes every occurrence", async () => {
    const { created } = await seriesWithHistory();
    await series.deleteTaskSeriesAndOccurrences(created.id);
    expect(await taskApi.getTasks()).toEqual([]);
    expect((await rowsOf(created.id)).every((r) => r.deletedAt !== null)).toBe(true);
    await expect(series.deleteTaskSeriesAndOccurrences(created.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
