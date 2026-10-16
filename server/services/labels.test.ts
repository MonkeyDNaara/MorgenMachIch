import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";
import { rule } from "@/lib/test/factories";
import { labels, seriesLabels, taskLabels, taskSeries, tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { NotFoundError, ValidationError } from "@/server/services/errors";
import { labelServices } from "@/server/services/labels";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;
let me: ReturnType<typeof labelServices>;
let other: ReturnType<typeof labelServices>;
let userId: string;
const [RED, BLUE] = LABEL_COLOR_HEXES;
const old = new Date("2026-01-01T00:00:00Z");

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

/** A fresh pair of users per test, so tests never see each other's rows. */
beforeEach(async () => {
  userId = await createTestUser(db, "Me");
  me = labelServices({ db, userId, source: "ui" });
  other = labelServices({ db, userId: await createTestUser(db, "Other"), source: "ui" });
});

async function insertTask(labelIds: string[], deleted = false) {
  const id = crypto.randomUUID();
  await db.insert(tasks).values({
    id,
    userId,
    title: "Task",
    updatedAt: old,
    deletedAt: deleted ? old : null,
  });
  if (labelIds.length) {
    await db.insert(taskLabels).values(labelIds.map((labelId) => ({ taskId: id, labelId })));
  }
  return id;
}

async function insertSeries(labelIds: string[]) {
  const id = crypto.randomUUID();
  await db.insert(taskSeries).values({
    id,
    userId,
    title: "Series",
    recurrence: rule({ frequency: "daily" }),
    startDate: old,
    updatedAt: old,
  });
  await db.insert(seriesLabels).values(labelIds.map((labelId) => ({ seriesId: id, labelId })));
  return id;
}

describe("create and read", () => {
  it("creates a label and reads it back, oldest first", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    const home = await me.createLabel({ name: "Home", color: BLUE });
    expect(work).toMatchObject({ name: "Work", color: RED });
    expect(await me.getLabel(work.id)).toEqual(work);
    expect((await me.getLabels()).map((l) => l.id)).toEqual([work.id, home.id]);
  });

  it("rejects invalid input with a ValidationError", async () => {
    await expect(me.createLabel({ name: "", color: RED })).rejects.toBeInstanceOf(ValidationError);
    await expect(me.createLabel({ name: "X", color: "#000000" as never })).rejects.toMatchObject({
      issues: [{ path: "color" }],
    });
  });

  it("rejects a name that matches an existing label like a #tag", async () => {
    await me.createLabel({ name: "Deep work", color: RED });
    await expect(me.createLabel({ name: "deep-work", color: BLUE })).rejects.toMatchObject({
      code: "validation",
      issues: [{ path: "name" }],
    });
  });

  it("keeps users apart: other users can't see the label and may use the same name", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    expect(await other.getLabel(work.id)).toBeUndefined();
    expect(await other.getLabels()).toEqual([]);
    await expect(other.createLabel({ name: "Work", color: RED })).resolves.toBeDefined();
  });
});

describe("ids that aren't uuids", () => {
  it("behave like missing labels instead of a database error", async () => {
    expect(await me.getLabel("not-a-uuid")).toBeUndefined();
    expect(await me.countTasksWithLabel("not-a-uuid")).toBe(0);
    await expect(me.updateLabel("not-a-uuid", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(me.deleteLabel("not-a-uuid")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ensureLabels", () => {
  it("reuses matching labels, creates the rest with the next unused colors", async () => {
    const deep = await me.createLabel({ name: "Deep work", color: LABEL_COLOR_HEXES[0] });
    const result = await me.ensureLabels(["deep-work", "Family", "family", "Sport"]);
    expect(result.labels.map((l) => l.name)).toEqual(["Deep work", "Family", "Sport"]);
    expect(result.labels[0]).toEqual(deep);
    expect(result.created.map((l) => [l.name, l.color])).toEqual([
      ["Family", LABEL_COLOR_HEXES[1]],
      ["Sport", LABEL_COLOR_HEXES[2]],
    ]);
  });

  it("never creates the same label twice for parallel calls", async () => {
    await Promise.all([me.ensureLabels(["family"]), me.ensureLabels(["Family"])]);
    expect((await me.getLabels()).map((l) => l.name)).toEqual(["family"]);
  });
});

describe("updateLabel", () => {
  it("updates name and color but never id or createdAt", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    const updated = await me.updateLabel(work.id, {
      name: "Job",
      color: BLUE,
      ...({ id: "x", createdAt: "y" } as object),
    });
    expect(updated).toEqual({ ...work, name: "Job", color: BLUE });
    expect(await me.getLabel(work.id)).toEqual(updated);
  });

  it("allows renaming a label to another spelling of its own name", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    await expect(me.updateLabel(work.id, { name: "work" })).resolves.toMatchObject({
      name: "work",
    });
  });

  it("rejects a name another label already has", async () => {
    await me.createLabel({ name: "Work", color: RED });
    const home = await me.createLabel({ name: "Home", color: BLUE });
    await expect(me.updateLabel(home.id, { name: "WORK" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("treats another user's or a deleted label as not found", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    await expect(other.updateLabel(work.id, { name: "Hacked" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await me.deleteLabel(work.id);
    await expect(me.updateLabel(work.id, { name: "Back" })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("countTasksWithLabel", () => {
  it("counts only the user's tasks that aren't deleted", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    await insertTask([work.id]);
    await insertTask([work.id]);
    await insertTask([work.id], true);
    await insertTask([]);
    expect(await me.countTasksWithLabel(work.id)).toBe(2);
    expect(await other.countTasksWithLabel(work.id)).toBe(0);
  });
});

describe("deleteLabel", () => {
  it("soft-deletes, removes the links and bumps updated_at of tasks and series", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    const home = await me.createLabel({ name: "Home", color: BLUE });
    const taskId = await insertTask([work.id, home.id]);
    const untouchedTaskId = await insertTask([home.id]);
    const seriesId = await insertSeries([work.id]);

    await me.deleteLabel(work.id);

    expect(await me.getLabel(work.id)).toBeUndefined();
    expect((await me.getLabels()).map((l) => l.id)).toEqual([home.id]);
    const [row] = await db.select().from(labels).where(eq(labels.id, work.id));
    expect(row.deletedAt).not.toBeNull();

    const links = await db.select().from(taskLabels).where(eq(taskLabels.taskId, taskId));
    expect(links.map((l) => l.labelId)).toEqual([home.id]);
    expect(await db.select().from(seriesLabels).where(eq(seriesLabels.seriesId, seriesId))).toEqual(
      [],
    );

    const updatedAt = async (table: typeof tasks | typeof taskSeries, id: string) =>
      (await db.select().from(table).where(eq(table.id, id)))[0].updatedAt;
    expect((await updatedAt(tasks, taskId)) > old).toBe(true);
    expect((await updatedAt(taskSeries, seriesId)) > old).toBe(true);
    expect(await updatedAt(tasks, untouchedTaskId)).toEqual(old);
  });

  it("frees the name for a new label", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    await me.deleteLabel(work.id);
    await expect(me.createLabel({ name: "Work", color: BLUE })).resolves.toBeDefined();
  });

  it("can't delete another user's label", async () => {
    const work = await me.createLabel({ name: "Work", color: RED });
    await expect(other.deleteLabel(work.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await me.getLabel(work.id)).toEqual(work);
  });
});
