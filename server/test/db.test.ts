import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { labels, tasks } from "@/server/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import type { Database } from "@/server/db/types";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let client: PGlite;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, client, close } = await createTestDb());
});
afterAll(() => close());

describe("PGlite test database", () => {
  it("has our tables from the real migration", async () => {
    const result = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' order by 1`,
    );
    expect(result.rows.map((r) => r.table_name)).toEqual([
      "app_settings",
      "labels",
      "series_labels",
      "subtasks",
      "task_labels",
      "task_series",
      "tasks",
    ]);
  });

  it("rejects rows for an unknown user and cascades a deleted one", async () => {
    const userId = await createTestUser(db);
    const labelId = crypto.randomUUID();
    await db.insert(labels).values({ id: labelId, userId, name: "Work", color: "#7ab8ff" });
    await db.insert(tasks).values({ id: crypto.randomUUID(), userId, title: "Task" });

    await expect(
      db.insert(labels).values({
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        name: "x",
        color: "#000000",
      }),
    ).rejects.toThrow();

    await db.execute(sql`delete from neon_auth."user" where id = ${userId}`);
    expect(await db.select().from(labels).where(eq(labels.userId, userId))).toEqual([]);
    expect(await db.select().from(tasks).where(eq(tasks.userId, userId))).toEqual([]);
  });

  it('sorts order keys byte-wise (COLLATE "C")', async () => {
    const userId = await createTestUser(db);
    for (const key of ["a", "B", "Z0"]) {
      await db
        .insert(tasks)
        .values({ id: crypto.randomUUID(), userId, title: key, sortOrder: key });
    }
    const rows = await db
      .select({ key: tasks.sortOrder })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.sortOrder);
    expect(rows.map((r) => r.key)).toEqual(["B", "Z0", "a"]);
  });
});
