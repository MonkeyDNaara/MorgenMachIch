import { db } from "@/lib/db/db";
import { TaskSchema, type Task, type NewTask } from "@/lib/types";

/** Fields callers may change after creation. id/createdAt/updatedAt are
 * managed by this file so a caller can never accidentally overwrite them. */
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;

function parseRowOrWarn(row: unknown): Task | undefined {
  const result = TaskSchema.safeParse(row);
  if (!result.success) {
    console.warn("Skipping invalid task row", row, result.error);
    return undefined;
  }
  return result.data;
}

export async function getTasks(): Promise<Task[]> {
  const rows = await db.tasks.toArray();
  return rows.map(parseRowOrWarn).filter((task): task is Task => task !== undefined);
}

export async function getTask(id: string): Promise<Task | undefined> {
  const row = await db.tasks.get(id);
  return row ? parseRowOrWarn(row) : undefined;
}

export async function createTask(input: NewTask): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = {
    ...input,
    id: crypto.randomUUID(),
    status: "open",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const validated = TaskSchema.parse(task);
  await db.tasks.add(validated);
  return validated;
}

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const existing = await db.tasks.get(id);
  if (!existing) throw new Error(`Task not found: ${id}`);
  const updated: Task = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const validated = TaskSchema.parse(updated);
  await db.tasks.put(validated);
  return validated;
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}
