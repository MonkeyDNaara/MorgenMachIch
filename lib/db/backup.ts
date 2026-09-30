import { db } from "@/lib/db/db";
import { generateOccurrences } from "@/lib/db/occurrences";
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

/**
 * Replaces everything in the app with the given (already validated)
 * backup data (#162). The wipe and the load happen in one Dexie
 * transaction, so a failure part-way leaves the existing data exactly as
 * it was. Afterwards, active series are topped up to the rolling horizon
 * (#60) so occurrences show immediately; that step is best-effort — the
 * data is already restored, and the app tops up again on the next load.
 */
export async function importAll(data: BackupData): Promise<void> {
  await db.transaction("rw", db.tasks, db.taskSeries, db.labels, async () => {
    await Promise.all([db.tasks.clear(), db.taskSeries.clear(), db.labels.clear()]);
    await db.labels.bulkAdd(data.labels);
    await db.taskSeries.bulkAdd(data.taskSeries);
    await db.tasks.bulkAdd(data.tasks);
  });

  try {
    await generateOccurrences();
  } catch (error) {
    console.warn("Imported data, but topping up recurring occurrences failed", error);
  }
}
