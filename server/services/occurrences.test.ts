import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";
import { makeSeries } from "@/lib/test/factories";
import type { TaskSeries } from "@/lib/types";
import { appSettings, seriesLabels, taskSeries, tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { labelServices } from "@/server/services/labels";
import { seriesToRow } from "@/server/services/mappers";
import { occurrenceServices } from "@/server/services/occurrences";
import { settingsServices } from "@/server/services/settings";
import { taskServices } from "@/server/services/tasks";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;
let userId: string;
let occurrences: ReturnType<typeof occurrenceServices>;
let taskApi: ReturnType<typeof taskServices>;
const now = new Date("2026-10-16T22:30:00Z"); // Sat 17 Oct, 00:30 in Berlin
const nextDay = new Date("2026-10-17T22:30:00Z");

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

beforeEach(async () => {
  userId = await createTestUser(db);
  const ctx = { db, userId, source: "ui" as const };
  occurrences = occurrenceServices(ctx);
  taskApi = taskServices(ctx);
  await settingsServices(ctx).updateSettings({ timeZone: "Europe/Berlin" });
});

async function insertSeries(overrides: Partial<TaskSeries> = {}): Promise<TaskSeries> {
  const series = makeSeries({
    id: crypto.randomUUID(),
    startDate: "2026-10-01T06:00:00.000Z", // 08:00 Berlin
    allDay: false,
    ...overrides,
  });
  await db.insert(taskSeries).values(seriesToRow(series, { userId, source: "ui" }));
  if (series.labelIds.length > 0) {
    await db
      .insert(seriesLabels)
      .values(series.labelIds.map((labelId) => ({ seriesId: series.id, labelId })));
  }
  return series;
}

const occurrenceRows = (seriesId: string) =>
  db.select().from(tasks).where(eq(tasks.seriesId, seriesId)).orderBy(tasks.occurrenceDate);

describe("generateOccurrences", () => {
  it("fills the 60-day horizon in the user's time zone, with template subtasks and labels", async () => {
    const label = await labelServices({ db, userId, source: "ui" }).createLabel({
      name: "Routine",
      color: LABEL_COLOR_HEXES[0],
    });
    const series = await insertSeries({
      title: "Stretch",
      subtaskTemplate: [{ title: "Neck" }, { title: "Back" }],
      labelIds: [label.id],
    });

    expect(await occurrences.generateOccurrences(now)).toBe(61);
    const rows = await occurrenceRows(series.id);
    expect(rows[0]).toMatchObject({
      occurrenceDate: "2026-10-17",
      dueDate: new Date("2026-10-17T06:00:00Z"),
      title: "Stretch",
      status: "open",
    });
    expect(rows.at(-1)?.occurrenceDate).toBe("2026-12-16");

    const [first] = (await taskApi.getTasks()).filter((t) => t.id === rows[0].id);
    expect(first.subtasks.map((s) => s.title)).toEqual(["Neck", "Back"]);
    expect(first.labelIds).toEqual([label.id]);
  });

  it("is idempotent and safe to run twice in parallel", async () => {
    const series = await insertSeries();
    const counts = await Promise.all([
      occurrences.generateOccurrences(now),
      occurrences.generateOccurrences(now),
    ]);
    expect(counts.reduce((a, b) => a + b)).toBe(61);
    expect(await occurrences.generateOccurrences(now)).toBe(0);
    expect(await occurrenceRows(series.id)).toHaveLength(61);
  });

  it("never recreates an occurrence the user deleted", async () => {
    const series = await insertSeries();
    await occurrences.generateOccurrences(now);
    const [first] = await occurrenceRows(series.id);
    await taskApi.deleteTask(first.id);
    expect(await occurrences.generateOccurrences(now)).toBe(0);
    const [again] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.seriesId, series.id), eq(tasks.occurrenceDate, "2026-10-17")));
    expect(again.id).toBe(first.id);
    expect(again.deletedAt).not.toBeNull();
  });

  it("skips paused and deleted series", async () => {
    const paused = await insertSeries({ active: false });
    const deleted = await insertSeries();
    await db.update(taskSeries).set({ deletedAt: now }).where(eq(taskSeries.id, deleted.id));
    expect(await occurrences.generateOccurrences(now)).toBe(0);
    expect(await occurrenceRows(paused.id)).toEqual([]);
  });

  it("does nothing without a time zone (no settings row yet)", async () => {
    const newUser = await createTestUser(db);
    const ctx = { db, userId: newUser, source: "ui" as const };
    expect(await occurrenceServices(ctx).generateOccurrences(now)).toBe(0);
  });
});

describe("ensureOccurrences (lazy trigger in getTasks)", () => {
  it("runs at most once per local day of the user", async () => {
    await occurrences.ensureOccurrences(now);
    const [settings] = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    expect(settings.occurrencesGeneratedOn).toBe("2026-10-17");

    const series = await insertSeries();
    await occurrences.ensureOccurrences(now); // same day: skipped
    expect(await occurrenceRows(series.id)).toEqual([]);

    await occurrences.ensureOccurrences(nextDay); // next local day: tops up
    const rows = await occurrenceRows(series.id);
    expect(rows[0].occurrenceDate).toBe("2026-10-18");
    expect(rows.at(-1)?.occurrenceDate).toBe("2026-12-17");
  });

  it("getTasks returns the generated occurrences", async () => {
    await insertSeries();
    const list = await taskApi.getTasks();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((task) => task.seriesId !== null)).toBe(true);
  });
});
