import { db } from "@/lib/db/db";
import { LabelSchema, type Label, type NewLabel } from "@/lib/types";

export type LabelPatch = Partial<Omit<Label, "id" | "createdAt">>;

function parseRowOrWarn(row: unknown): Label | undefined {
  const result = LabelSchema.safeParse(row);
  if (!result.success) {
    console.warn("Skipping invalid label row", row, result.error);
    return undefined;
  }
  return result.data;
}

export async function getLabels(): Promise<Label[]> {
  const rows = await db.labels.toArray();
  return rows.map(parseRowOrWarn).filter((label): label is Label => label !== undefined);
}

export async function getLabel(id: string): Promise<Label | undefined> {
  const row = await db.labels.get(id);
  return row ? parseRowOrWarn(row) : undefined;
}

export async function createLabel(input: NewLabel): Promise<Label> {
  const label: Label = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const validated = LabelSchema.parse(label);
  await db.labels.add(validated);
  return validated;
}

export async function updateLabel(id: string, patch: LabelPatch): Promise<Label> {
  const existing = await db.labels.get(id);
  if (!existing) throw new Error(`Label not found: ${id}`);
  const updated: Label = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt };
  const validated = LabelSchema.parse(updated);
  await db.labels.put(validated);
  return validated;
}

/**
 * Counts tasks currently tagged with this label — shown in the delete
 * confirmation so the cascade cleanup below isn't a silent side effect.
 * Uses the *labelIds multi-entry index (lib/db/db.ts) instead of
 * scanning the whole tasks table.
 */
export async function countTasksWithLabel(id: string): Promise<number> {
  return db.tasks.where("labelIds").equals(id).count();
}

/**
 * Deletes a label and strips it from every task/series that references it
 * (cascade cleanup), so nothing else in the app has to know or care about
 * orphaned label references.
 */
export async function deleteLabel(id: string): Promise<void> {
  await db.transaction("rw", db.tasks, db.taskSeries, db.labels, async () => {
    const tasksWithLabel = await db.tasks.where("labelIds").equals(id).toArray();
    for (const task of tasksWithLabel) {
      await db.tasks.update(task.id, {
        labelIds: task.labelIds.filter((labelId) => labelId !== id),
      });
    }

    const seriesWithLabel = await db.taskSeries
      .filter((series) => series.labelIds.includes(id))
      .toArray();
    for (const series of seriesWithLabel) {
      await db.taskSeries.update(series.id, {
        labelIds: series.labelIds.filter((labelId) => labelId !== id),
      });
    }

    await db.labels.delete(id);
  });
}
