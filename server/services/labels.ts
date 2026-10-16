import "server-only";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { normalizeLabelName, pickLabelColors } from "@/lib/domain/labelNames";
import { LabelSchema, NewLabelSchema, type Label, type NewLabel } from "@/lib/types";
import { labels, seriesLabels, taskLabels, taskSeries, tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { ServiceContext } from "@/server/services/context";
import { NotFoundError, ValidationError } from "@/server/services/errors";
import { labelToRow, parseRows, rowToLabel } from "@/server/services/mappers";

export type LabelPatch = Partial<Omit<Label, "id" | "createdAt">>;

/** Label services (#405) — the server twin of `lib/db/labels.ts`. */
export function labelServices(ctx: ServiceContext) {
  const { db, userId, source } = ctx;
  const live = and(eq(labels.userId, userId), isNull(labels.deletedAt));

  /** The user's labels, oldest first (id breaks ties of a batch from `ensureLabels`). */
  async function selectLabels(tx: Database): Promise<Label[]> {
    const rows = await tx
      .select()
      .from(labels)
      .where(live)
      .orderBy(asc(labels.createdAt), asc(labels.id));
    return parseRows(LabelSchema, "label", rows.map(rowToLabel));
  }

  /**
   * Serialises label writes of one user: Postgres runs transactions in parallel, so two
   * quick adds with `#family` could otherwise both create the label (Dexie never could).
   * Released automatically at the end of the transaction.
   */
  async function lockLabels(tx: Database): Promise<void> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`labels:${userId}`}, 0))`);
  }

  /** Names are unique per user the way a `#tag` matches (#202): "Deep work" = "deep-work". */
  function assertNameFree(existing: Label[], name: string, exceptId?: string): void {
    const key = normalizeLabelName(name);
    const clash = existing.find(
      (label) => label.id !== exceptId && normalizeLabelName(label.name) === key,
    );
    if (clash) {
      throw new ValidationError("label", [
        { path: "name", message: `A label named "${clash.name}" already exists` },
      ]);
    }
  }

  async function insertLabel(tx: Database, input: NewLabel): Promise<Label> {
    const result = LabelSchema.safeParse({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    if (!result.success) throw new ValidationError("label", result.error);
    await tx.insert(labels).values(labelToRow(result.data, { userId, source }));
    return result.data;
  }

  async function getLabels(): Promise<Label[]> {
    return selectLabels(db);
  }

  async function getLabel(id: string): Promise<Label | undefined> {
    const [row] = await db
      .select()
      .from(labels)
      .where(and(live, eq(labels.id, id)));
    return row ? parseRows(LabelSchema, "label", [rowToLabel(row)])[0] : undefined;
  }

  async function createLabel(input: NewLabel): Promise<Label> {
    const parsed = NewLabelSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("label", parsed.error);
    return db.transaction(async (tx) => {
      await lockLabels(tx);
      assertNameFree(await selectLabels(tx), parsed.data.name);
      return insertLabel(tx, parsed.data);
    });
  }

  /**
   * Labels for these names (#283), creating the missing ones with the next unused palette
   * colors — same rules as `lib/db`. Returns the labels in the order of `names` and which
   * of them are new.
   */
  async function ensureLabels(names: string[]): Promise<{ labels: Label[]; created: Label[] }> {
    return db.transaction(async (tx) => {
      await lockLabels(tx);
      const existing = await selectLabels(tx);
      const found: Label[] = [];
      const created: Label[] = [];
      for (const name of names) {
        const key = normalizeLabelName(name);
        const match = [...existing, ...created].find(
          (label) => normalizeLabelName(label.name) === key,
        );
        if (match) {
          if (!found.includes(match)) found.push(match);
          continue;
        }
        const [color] = pickLabelColors(
          [...existing, ...created].map((label) => label.color),
          1,
        );
        const label = await insertLabel(tx, { name, color });
        created.push(label);
        found.push(label);
      }
      return { labels: found, created };
    });
  }

  async function updateLabel(id: string, patch: LabelPatch): Promise<Label> {
    return db.transaction(async (tx) => {
      await lockLabels(tx);
      const existing = await selectLabels(tx);
      const current = existing.find((label) => label.id === id);
      if (!current) throw new NotFoundError("label", id);
      const result = LabelSchema.safeParse({
        ...current,
        ...patch,
        id,
        createdAt: current.createdAt,
      });
      if (!result.success) throw new ValidationError("label", result.error);
      assertNameFree(existing, result.data.name, id);
      await tx
        .update(labels)
        .set({ name: result.data.name, color: result.data.color })
        .where(and(live, eq(labels.id, id)));
      return result.data;
    });
  }

  /** Not-deleted tasks of this user that carry the label (shown in the delete dialog). */
  async function countTasksWithLabel(id: string): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(taskLabels)
      .innerJoin(tasks, eq(tasks.id, taskLabels.taskId))
      .where(and(eq(taskLabels.labelId, id), eq(tasks.userId, userId), isNull(tasks.deletedAt)));
    return value;
  }

  /**
   * Soft-deletes the label. A soft delete doesn't fire the `on delete cascade` of the link
   * tables, so the links are removed here, and the tasks/series that lost the label get a
   * new `updated_at` so `updatedSince` (#310) reports the change.
   */
  async function deleteLabel(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      const now = new Date();
      const deleted = await tx
        .update(labels)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(live, eq(labels.id, id)))
        .returning({ id: labels.id });
      if (deleted.length === 0) throw new NotFoundError("label", id);

      const taskLinks = await tx
        .delete(taskLabels)
        .where(eq(taskLabels.labelId, id))
        .returning({ taskId: taskLabels.taskId });
      if (taskLinks.length > 0) {
        await tx
          .update(tasks)
          .set({ updatedAt: now })
          .where(
            and(
              eq(tasks.userId, userId),
              inArray(
                tasks.id,
                taskLinks.map((l) => l.taskId),
              ),
            ),
          );
      }

      const seriesLinks = await tx
        .delete(seriesLabels)
        .where(eq(seriesLabels.labelId, id))
        .returning({ seriesId: seriesLabels.seriesId });
      if (seriesLinks.length > 0) {
        await tx
          .update(taskSeries)
          .set({ updatedAt: now })
          .where(
            and(
              eq(taskSeries.userId, userId),
              inArray(
                taskSeries.id,
                seriesLinks.map((l) => l.seriesId),
              ),
            ),
          );
      }
    });
  }

  return {
    getLabels,
    getLabel,
    createLabel,
    ensureLabels,
    updateLabel,
    countTasksWithLabel,
    deleteLabel,
  };
}
