import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";
import { localIso, makeSeries, makeTask } from "@/lib/test/factories";
import { LabelSchema, TaskSchema, TaskSeriesSchema, type Label } from "@/lib/types";
import { appSettings, labels, subtasks, taskLabels, taskSeries, tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import {
  labelToRow,
  parseRows,
  rowToLabel,
  rowToSeries,
  rowToSettings,
  rowToTask,
  seriesToRow,
  subtasksToRows,
  taskToRow,
} from "@/server/services/mappers";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;
let userId: string;
const owner = () => ({ userId, source: "ui" as const });
const uuid = () => crypto.randomUUID();

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  userId = await createTestUser(db);
});
afterAll(() => close());

/** Round trips go through the real database, so column types and defaults are part of the test. */
describe("mappers round-trip through Postgres", () => {
  it("label", async () => {
    const label: Label = {
      id: uuid(),
      name: "Deep work",
      color: LABEL_COLOR_HEXES[3],
      createdAt: localIso(2026, 10, 1, 9, 30),
    };
    await db.insert(labels).values(labelToRow(label, owner()));
    const [row] = await db.select().from(labels).where(eq(labels.id, label.id));
    expect(LabelSchema.parse(rowToLabel(row))).toEqual(label);
  });

  it("task with notes, labels, ordered subtasks and a manual order key", async () => {
    const labelId = uuid();
    await db
      .insert(labels)
      .values({ id: labelId, userId, name: "Work", color: LABEL_COLOR_HEXES[0] });
    const task = makeTask({
      id: uuid(),
      notes: "**Bring** the slides",
      labelIds: [labelId],
      subtasks: [
        { id: uuid(), title: "Outline", done: true },
        { id: uuid(), title: "Draft", done: false },
        { id: uuid(), title: "Review", done: false },
      ],
      status: "done",
      completedAt: localIso(2026, 10, 9, 11, 15),
      sortOrder: "a1",
    });

    await db.insert(tasks).values(taskToRow(task, owner()));
    await db.insert(subtasks).values(subtasksToRows(task.id, userId, task.subtasks));
    await db.insert(taskLabels).values({ taskId: task.id, labelId });

    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    const subtaskRows = await db.select().from(subtasks).where(eq(subtasks.taskId, task.id));
    // Fetched in reverse to prove the mapper restores the order from the keys.
    const mapped = rowToTask(row, [labelId], subtaskRows.reverse());
    expect(TaskSchema.parse(mapped)).toEqual(task);
  });

  it("task without notes, due date or order key", async () => {
    const task = makeTask({ id: uuid(), dueDate: null, sortOrder: null });
    await db.insert(tasks).values(taskToRow(task, owner()));
    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    const mapped = rowToTask(row, [], []);
    expect(mapped).not.toHaveProperty("notes");
    expect(TaskSchema.parse(mapped)).toEqual(task);
  });

  it("series with recurrence, template and notes", async () => {
    const series = makeSeries({
      id: uuid(),
      notes: "Leg day on Thursdays",
      recurrence: { frequency: "weekly", interval: 2, daysOfWeek: [1, 4], endDate: "2026-12-31" },
      subtaskTemplate: [{ title: "Stretch" }, { title: "Lift" }],
      allDay: false,
      startDate: localIso(2026, 9, 7, 18),
    });
    await db.insert(taskSeries).values(seriesToRow(series, owner()));
    const [row] = await db.select().from(taskSeries).where(eq(taskSeries.id, series.id));
    expect(TaskSeriesSchema.parse(rowToSeries(row, series.labelIds))).toEqual(series);
  });

  it("settings: no row means defaults, a row maps statsSince", async () => {
    expect(rowToSettings(undefined)).toEqual({ id: "app", statsSince: null });
    const since = new Date(2026, 9, 1);
    await db.insert(appSettings).values({ userId, statsSince: since, timeZone: "Europe/Berlin" });
    const [row] = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    expect(rowToSettings(row)).toEqual({ id: "app", statsSince: since.toISOString() });
  });

  it("an occurrence keeps the occurrence date the caller passes", async () => {
    const series = makeSeries({ id: uuid() });
    await db.insert(taskSeries).values(seriesToRow(series, owner()));
    const task = makeTask({
      id: uuid(),
      seriesId: series.id,
      allDay: true,
      dueDate: localIso(2026, 10, 9),
    });
    await db.insert(tasks).values(taskToRow(task, owner(), "2026-10-09"));
    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(row.occurrenceDate).toBe("2026-10-09");
  });
});

describe("subtasksToRows", () => {
  it("gives increasing keys in list order", () => {
    const rows = subtasksToRows("t", "u", [
      { id: "1", title: "a", done: false },
      { id: "2", title: "b", done: false },
      { id: "3", title: "c", done: false },
    ]);
    const keys = rows.map((r) => r.sortOrder);
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(3);
  });
});

describe("parseRows", () => {
  it("keeps valid rows and skips invalid ones with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const good = {
      id: "l1",
      name: "Work",
      color: LABEL_COLOR_HEXES[0],
      createdAt: "2026-10-01T00:00:00.000Z",
    };
    const bad = { ...good, id: "l2", color: "#123456" };
    expect(parseRows(LabelSchema, "label", [good, bad])).toEqual([good]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
