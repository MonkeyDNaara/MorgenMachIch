import { db } from "@/lib/db/db";
import { GENERATION_HORIZON_DAYS, generateOccurrences } from "@/lib/db/occurrences";
import { buildSampleData } from "@/lib/demo/sampleData";
import { LabelSchema, TaskSchema, TaskSeriesSchema } from "@/lib/types";

export type SampleLoadResult = "loaded" | "not-empty";

/**
 * Fills an empty app with the sample data (#84). The emptiness check and
 * the writes run in one transaction, so it can never mix with existing
 * data — if anything is there (tasks, series or labels), nothing is
 * written. The sample already contains every occurrence up to the
 * generation horizon; the top-up afterwards is only a safety net.
 */
export async function loadSampleData(now: Date = new Date()): Promise<SampleLoadResult> {
  const data = buildSampleData(now, () => crypto.randomUUID(), GENERATION_HORIZON_DAYS);
  const labels = data.labels.map((label) => LabelSchema.parse(label));
  const series = data.taskSeries.map((item) => TaskSeriesSchema.parse(item));
  const tasks = data.tasks.map((task) => TaskSchema.parse(task));

  const result = await db.transaction("rw", db.tasks, db.taskSeries, db.labels, async () => {
    const counts = await Promise.all([db.tasks.count(), db.taskSeries.count(), db.labels.count()]);
    if (counts.some((count) => count > 0)) return "not-empty" as const;
    await db.labels.bulkAdd(labels);
    await db.taskSeries.bulkAdd(series);
    await db.tasks.bulkAdd(tasks);
    return "loaded" as const;
  });

  if (result === "loaded") {
    try {
      await generateOccurrences(now);
    } catch (error) {
      console.warn("Loaded the sample data, but topping up occurrences failed", error);
    }
  }
  return result;
}
