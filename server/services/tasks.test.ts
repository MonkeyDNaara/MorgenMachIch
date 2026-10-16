import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";
import { sortBacklogTasks } from "@/lib/domain/backlog";
import type { NewTask, Subtask } from "@/lib/types";
import { subtasks, tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/services/errors";
import { labelServices } from "@/server/services/labels";
import { taskServices } from "@/server/services/tasks";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;
let me: ReturnType<typeof taskServices>;
let other: ReturnType<typeof taskServices>;
let myLabels: ReturnType<typeof labelServices>;
let otherLabels: ReturnType<typeof labelServices>;
const [RED, BLUE, GREEN] = LABEL_COLOR_HEXES;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

/** A fresh pair of users per test, so tests never see each other's rows. */
beforeEach(async () => {
  const ctx = { db, userId: await createTestUser(db, "Me"), source: "ui" as const };
  const otherCtx = { db, userId: await createTestUser(db, "Other"), source: "ui" as const };
  me = taskServices(ctx);
  myLabels = labelServices(ctx);
  other = taskServices(otherCtx);
  otherLabels = labelServices(otherCtx);
});

const input = (overrides: Partial<NewTask> = {}): NewTask => ({
  title: "Task",
  priority: "none",
  dueDate: null,
  allDay: false,
  labelIds: [],
  subtasks: [],
  seriesId: null,
  ...overrides,
});
const subtask = (title: string, done = false): Subtask => ({
  id: crypto.randomUUID(),
  title,
  done,
});

describe("create and read", () => {
  it("creates an open Backlog task and reads it back", async () => {
    const task = await me.createTask(input({ title: "Write CV", notes: "**bold**" }));
    expect(task).toMatchObject({
      title: "Write CV",
      notes: "**bold**",
      status: "open",
      completedAt: null,
      sortOrder: null,
      seriesId: null,
    });
    expect(task.createdAt).toBe(task.updatedAt);
    expect(await me.getTask(task.id)).toEqual(task);
    expect(await me.getTasks()).toEqual([task]);
  });

  it("keeps the subtask order and the labels", async () => {
    const home = await myLabels.createLabel({ name: "Home", color: RED });
    const work = await myLabels.createLabel({ name: "Work", color: BLUE });
    const list = [subtask("c"), subtask("a", true), subtask("b")];
    const task = await me.createTask(input({ subtasks: list, labelIds: [work.id, home.id] }));
    expect(task.subtasks).toEqual(list);
    // label order: oldest label first (the link table has no position)
    expect(task.labelIds).toEqual([home.id, work.id]);
  });

  it("rejects invalid input and tasks of a series", async () => {
    await expect(me.createTask(input({ title: "" }))).rejects.toBeInstanceOf(ValidationError);
    await expect(me.createTask(input({ seriesId: crypto.randomUUID() }))).rejects.toMatchObject({
      issues: [{ path: "seriesId" }],
    });
    await expect(
      me.createTask(input({ subtasks: [{ id: "s1", title: "x", done: false }] })),
    ).rejects.toMatchObject({ issues: [{ path: "subtasks.0.id" }] });
  });

  it("refuses another user's or an unknown label, drops an own deleted one", async () => {
    const foreign = await otherLabels.createLabel({ name: "Theirs", color: RED });
    await expect(me.createTask(input({ labelIds: [foreign.id] }))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(me.createTask(input({ labelIds: [crypto.randomUUID()] }))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(me.createTask(input({ labelIds: ["nope"] }))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(await me.getTasks()).toEqual([]);

    const gone = await myLabels.createLabel({ name: "Gone", color: RED });
    const kept = await myLabels.createLabel({ name: "Kept", color: BLUE });
    await myLabels.deleteLabel(gone.id);
    const task = await me.createTask(input({ labelIds: [gone.id, kept.id] }));
    expect(task.labelIds).toEqual([kept.id]);
  });

  it("keeps users apart", async () => {
    const task = await me.createTask(input());
    expect(await other.getTask(task.id)).toBeUndefined();
    expect(await other.getTasks()).toEqual([]);
    expect(await me.getTask("not-a-uuid")).toBeUndefined();
  });
});

describe("updateTask", () => {
  it("updates fields, bumps updatedAt, never changes id or createdAt", async () => {
    const task = await me.createTask(input());
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await me.updateTask(task.id, {
      title: "Renamed",
      priority: "high",
      ...({ id: "x", createdAt: "y" } as object),
    });
    expect(updated).toMatchObject({ id: task.id, createdAt: task.createdAt, title: "Renamed" });
    expect(updated.updatedAt > task.updatedAt).toBe(true);
    expect(await me.getTask(task.id)).toEqual(updated);
  });

  it("owns completedAt: set when done, kept while done, cleared otherwise", async () => {
    const task = await me.createTask(input());
    const sent = "2000-01-01T00:00:00.000Z";
    const done = await me.updateTask(task.id, { status: "done", completedAt: sent });
    expect(done.completedAt).not.toBeNull();
    expect(done.completedAt).not.toBe(sent);

    const edited = await me.updateTask(task.id, { title: "Still done", completedAt: null });
    expect(edited.completedAt).toBe(done.completedAt);

    expect((await me.updateTask(task.id, { status: "open" })).completedAt).toBeNull();
    expect((await me.updateTask(task.id, { status: "skipped" })).completedAt).toBeNull();
  });

  it("replaces subtasks and labels only when they are in the patch", async () => {
    const home = await myLabels.createLabel({ name: "Home", color: RED });
    const work = await myLabels.createLabel({ name: "Work", color: GREEN });
    const [a, b] = [subtask("a"), subtask("b")];
    const task = await me.createTask(input({ subtasks: [a, b], labelIds: [home.id] }));

    const renamed = await me.updateTask(task.id, { title: "Only the title" });
    expect(renamed.subtasks).toEqual([a, b]);
    expect(renamed.labelIds).toEqual([home.id]);

    const c = subtask("c");
    const updated = await me.updateTask(task.id, {
      subtasks: [b, { ...a, done: true }, c],
      labelIds: [work.id],
    });
    expect(updated.subtasks).toEqual([b, { ...a, done: true }, c]);
    expect(updated.labelIds).toEqual([work.id]);
    const rows = await db.select().from(subtasks).where(eq(subtasks.taskId, task.id));
    expect(rows).toHaveLength(3);
  });

  it("rejects a foreign label without changing anything", async () => {
    const foreign = await otherLabels.createLabel({ name: "Theirs", color: RED });
    const task = await me.createTask(input());
    await expect(
      me.updateTask(task.id, { title: "Changed", labelIds: [foreign.id] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await me.getTask(task.id)).toEqual(task);
  });

  it("can't move a task into a series", async () => {
    const task = await me.createTask(input());
    await expect(me.updateTask(task.id, { seriesId: crypto.randomUUID() })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(me.updateTask(task.id, { seriesId: null })).resolves.toBeDefined();
  });

  it("treats another user's, a deleted or a malformed id as not found", async () => {
    const task = await me.createTask(input());
    await expect(other.updateTask(task.id, { title: "Hacked" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await me.deleteTask(task.id);
    await expect(me.updateTask(task.id, { title: "Back" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(me.updateTask("nope", { title: "X" })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteTask", () => {
  it("soft-deletes: invisible to reads, row kept", async () => {
    const task = await me.createTask(input({ subtasks: [subtask("a")] }));
    await me.deleteTask(task.id);
    expect(await me.getTask(task.id)).toBeUndefined();
    expect(await me.getTasks()).toEqual([]);
    const [row] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(row.deletedAt).not.toBeNull();
  });

  it("can't delete another user's task", async () => {
    const task = await me.createTask(input());
    await expect(other.deleteTask(task.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(me.deleteTask("nope")).rejects.toBeInstanceOf(NotFoundError);
    expect(await me.getTask(task.id)).toEqual(task);
  });
});

describe("reorderBacklogTask", () => {
  const backlogTitles = async () =>
    sortBacklogTasks((await me.getTasks()).filter((t) => t.dueDate === null)).map((t) => t.title);

  it("moves a task between two neighbours", async () => {
    const a = await me.createTask(input({ title: "a" }));
    const b = await me.createTask(input({ title: "b" }));
    const c = await me.createTask(input({ title: "c" }));
    await me.reorderBacklogTask(c.id, a.id, b.id);
    expect(await backlogTitles()).toEqual(["a", "c", "b"]);
    await me.reorderBacklogTask(a.id, null, c.id);
    expect(await backlogTitles()).toEqual(["a", "c", "b"]);
    await me.reorderBacklogTask(a.id, b.id, null);
    expect(await backlogTitles()).toEqual(["c", "b", "a"]);
  });

  it("rejects tasks that aren't in the user's Backlog", async () => {
    const a = await me.createTask(input({ title: "a" }));
    const dated = await me.createTask(input({ dueDate: new Date().toISOString() }));
    await expect(me.reorderBacklogTask(dated.id, a.id, null)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(other.reorderBacklogTask(a.id, null, null)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
