import { db } from "@/lib/db/db";
import { getLabels } from "@/lib/db/labels";
import { listTaskSeries } from "@/lib/db/taskSeries";
import { getTasks } from "@/lib/db/tasks";
import type { BackupData } from "@/lib/utils/backup";

/**
 * Reads everything the app stores, for a JSON backup (#161). Goes through
 * the validated repository reads, so a corrupt row is skipped (with a
 * warning) rather than exported. Runs in one read transaction so the three
 * tables are a consistent snapshot even if something writes mid-export.
 */
export async function exportAll(): Promise<BackupData> {
  return db.transaction("r", db.tasks, db.taskSeries, db.labels, async () => {
    const [tasks, taskSeries, labels] = await Promise.all([getTasks(), listTaskSeries(), getLabels()]);
    return { tasks, taskSeries, labels };
  });
}

export type DataCounts = { tasks: number; taskSeries: number; labels: number };

/** Row counts per table — shown on Settings, and reused by the import
 * preview and delete-all confirm (#162, #163). */
export async function getDataCounts(): Promise<DataCounts> {
  const [tasks, taskSeries, labels] = await Promise.all([db.tasks.count(), db.taskSeries.count(), db.labels.count()]);
  return { tasks, taskSeries, labels };
}
