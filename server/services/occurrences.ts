import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { localDayIn, planOccurrences } from "@/lib/domain/occurrencePlan";
import { TaskSeriesSchema, type TaskSeries } from "@/lib/types";
import {
  appSettings,
  seriesLabels,
  subtasks,
  taskLabels,
  taskSeries,
  tasks,
} from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { ServiceContext } from "@/server/services/context";
import { keysBetween } from "@/lib/domain/orderKey";
import { parseRows, rowToSeries } from "@/server/services/mappers";

/**
 * Server-side occurrence generation (#312) — replaces the browser's `OccurrenceSync`, so a
 * series created through the API gets its tasks without the app being open, and two
 * devices can't create duplicates.
 *
 * Runs after every series write (#407) and lazily before `getTasks`, at most once per
 * local day (`app_settings.occurrences_generated_on`). That GET may write is deliberate:
 * occurrences are derived data, and the insert is idempotent.
 */
export function occurrenceServices(ctx: ServiceContext) {
  const { db, userId, source } = ctx;

  async function readSettings(tx: Database) {
    const [row] = await tx.select().from(appSettings).where(eq(appSettings.userId, userId));
    return row;
  }

  /**
   * Inserts the series' missing occurrences through the horizon. The unique index
   * `(series_id, occurrence_date)` + `on conflict do nothing` makes parallel runs safe, and
   * keeps a deleted occurrence (its row is a tombstone) from coming back. Subtasks from the
   * template and the series' labels are written only for rows that were really inserted.
   * Returns how many occurrences were created.
   */
  async function topUpSeries(
    tx: Database,
    series: TaskSeries,
    timeZone: string,
    now: Date = new Date(),
  ): Promise<number> {
    if (!series.active) return 0;
    const planned = planOccurrences(series, timeZone, now);
    if (planned.length === 0) return 0;

    const inserted = await tx
      .insert(tasks)
      .values(
        planned.map(({ occurrenceDate, dueDate }) => ({
          id: crypto.randomUUID(),
          userId,
          seriesId: series.id,
          title: series.title,
          notes: series.notes ?? null,
          priority: series.priority,
          dueDate: new Date(dueDate),
          allDay: series.allDay,
          occurrenceDate,
          source,
        })),
      )
      .onConflictDoNothing({ target: [tasks.seriesId, tasks.occurrenceDate] })
      .returning({ id: tasks.id });
    if (inserted.length === 0) return 0;

    if (series.subtaskTemplate.length > 0) {
      const keys = keysBetween(null, null, series.subtaskTemplate.length);
      await tx.insert(subtasks).values(
        inserted.flatMap(({ id: taskId }) =>
          series.subtaskTemplate.map((template, index) => ({
            id: crypto.randomUUID(),
            taskId,
            userId,
            title: template.title,
            done: false,
            sortOrder: keys[index],
          })),
        ),
      );
    }
    if (series.labelIds.length > 0) {
      await tx
        .insert(taskLabels)
        .values(
          inserted.flatMap(({ id: taskId }) =>
            series.labelIds.map((labelId) => ({ taskId, labelId })),
          ),
        );
    }
    return inserted.length;
  }

  /**
   * Tops up every active series of the user and remembers the local day. Without a
   * settings row there is no time zone yet — nothing to do (the browser saves it right
   * after sign-in, #309).
   */
  async function generateOccurrences(now: Date = new Date()): Promise<number> {
    return db.transaction(async (tx) => {
      const settings = await readSettings(tx);
      if (!settings) return 0;
      const rows = await tx
        .select()
        .from(taskSeries)
        .where(
          and(
            eq(taskSeries.userId, userId),
            isNull(taskSeries.deletedAt),
            eq(taskSeries.active, true),
          ),
        );
      const links = await tx
        .select({ seriesId: seriesLabels.seriesId, labelId: seriesLabels.labelId })
        .from(seriesLabels)
        .innerJoin(taskSeries, eq(taskSeries.id, seriesLabels.seriesId))
        .where(eq(taskSeries.userId, userId));
      const allSeries = parseRows(
        TaskSeriesSchema,
        "series",
        rows.map((row) =>
          rowToSeries(
            row,
            links.filter((link) => link.seriesId === row.id).map((link) => link.labelId),
          ),
        ),
      );

      let created = 0;
      for (const series of allSeries) {
        created += await topUpSeries(tx, series, settings.timeZone, now);
      }
      await tx
        .update(appSettings)
        .set({ occurrencesGeneratedOn: localDayIn(settings.timeZone, now) })
        .where(eq(appSettings.userId, userId));
      return created;
    });
  }

  /** The lazy trigger: generates at most once per local day of the user. */
  async function ensureOccurrences(now: Date = new Date()): Promise<void> {
    const settings = await readSettings(db);
    if (!settings) return;
    if (settings.occurrencesGeneratedOn === localDayIn(settings.timeZone, now)) return;
    await generateOccurrences(now);
  }

  return { topUpSeries, generateOccurrences, ensureOccurrences };
}
