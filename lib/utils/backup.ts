import { LabelSchema, TaskSchema, TaskSeriesSchema, type Label, type Task, type TaskSeries } from "@/lib/types";

/** Identifies a file as one of this app's backups, so importing (#162)
 * can reject an unrelated JSON file with a clear message. */
export const BACKUP_APP_NAME = "morgenmachich";

/** Bump when the backup shape changes in a way old files can't satisfy,
 * and teach the importer to migrate (or reject) the older versions. */
export const BACKUP_VERSION = 1;

export type BackupData = {
  tasks: Task[];
  taskSeries: TaskSeries[];
  labels: Label[];
};

export type BackupFile = {
  app: typeof BACKUP_APP_NAME;
  version: number;
  exportedAt: string;
  data: BackupData;
};

/** Wraps app data in the versioned envelope that gets written to disk. */
export function buildBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return {
    app: BACKUP_APP_NAME,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

/** e.g. "morgenmachich-backup-2026-09-30.json", dated in local time so it
 * matches the day the user sees on their own clock. An optional label is
 * slotted in before the date ("morgenmachich-backup-before-import-...")
 * so a safety backup is easy to tell apart from a regular export. */
export function backupFileName(now: Date = new Date(), label?: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${BACKUP_APP_NAME}-backup-${label ? `${label}-` : ""}${date}.json`;
}

export type BackupParseResult = { ok: true; backup: BackupFile } | { ok: false; errors: string[] };

/** Cap on listed problems so a badly broken file doesn't produce a wall of
 * text; the last entry says how many more were left out. */
const MAX_ERRORS = 20;

type RowSchema<T> = {
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates every row of one collection against its Zod schema and
 * checks ids are unique. Problems are pushed onto `errors`; only rows
 * that pass are returned (the caller rejects the file if any failed). */
function validateRows<T extends { id: string }>(
  kind: string,
  rows: unknown[],
  schema: RowSchema<T>,
  errors: string[],
): T[] {
  const valid: T[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    const title = isRecord(row) && typeof row.title === "string" ? ` ("${row.title}")` : "";
    const name = `${kind} #${index + 1}${title}`;

    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : "";
      errors.push(`${name} is invalid — ${where}${issue.message}`);
      return;
    }
    if (seenIds.has(result.data.id)) {
      errors.push(`${name} has a duplicate id (${result.data.id}).`);
      return;
    }
    seenIds.add(result.data.id);
    valid.push(result.data);
  });

  return valid;
}

function capErrors(errors: string[]): string[] {
  if (errors.length <= MAX_ERRORS) return errors;
  return [...errors.slice(0, MAX_ERRORS), `…and ${errors.length - MAX_ERRORS} more problems.`];
}

/**
 * Parses and validates the text of a backup file (#162). All-or-nothing:
 * the result is either a fully valid backup or a list of what is wrong —
 * never a partial one, so a half-broken backup can't be half-restored.
 *
 * Checks, in order: valid JSON -> our envelope (app name, supported
 * version) -> every row against its Zod schema, with unique ids ->
 * references (every labelIds entry exists in the file's labels; every
 * non-null seriesId exists in the file's series).
 */
export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file isn't valid JSON."] };
  }

  if (!isRecord(raw) || raw.app !== BACKUP_APP_NAME) {
    return { ok: false, errors: ["This doesn't look like a MorgenMachIch backup file."] };
  }

  const { version } = raw;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, errors: ["The backup has a missing or invalid format version."] };
  }
  if (version > BACKUP_VERSION) {
    return {
      ok: false,
      errors: [
        `This backup was made by a newer version of MorgenMachIch (backup format v${version}); this version understands up to v${BACKUP_VERSION}.`,
      ],
    };
  }

  const { exportedAt, data } = raw;
  if (typeof exportedAt !== "string") {
    return { ok: false, errors: ["The backup is missing its export date."] };
  }
  if (
    !isRecord(data) ||
    !Array.isArray(data.tasks) ||
    !Array.isArray(data.taskSeries) ||
    !Array.isArray(data.labels)
  ) {
    return { ok: false, errors: ["The backup is missing its tasks, series or labels lists."] };
  }

  const errors: string[] = [];
  const tasks = validateRows<Task>("Task", data.tasks, TaskSchema, errors);
  const taskSeries = validateRows<TaskSeries>("Series", data.taskSeries, TaskSeriesSchema, errors);
  const labels = validateRows<Label>("Label", data.labels, LabelSchema, errors);

  // Reference checks only make sense against rows that are themselves
  // valid; rows already reported above are not double-counted.
  const labelIds = new Set(labels.map((label) => label.id));
  const seriesIds = new Set(taskSeries.map((series) => series.id));

  for (const task of tasks) {
    const missing = task.labelIds.filter((id) => !labelIds.has(id));
    if (missing.length > 0) {
      errors.push(`Task "${task.title}" refers to ${missing.length} label(s) that aren't in the file.`);
    }
    if (task.seriesId !== null && !seriesIds.has(task.seriesId)) {
      errors.push(`Task "${task.title}" belongs to a recurring series that isn't in the file.`);
    }
  }
  for (const series of taskSeries) {
    const missing = series.labelIds.filter((id) => !labelIds.has(id));
    if (missing.length > 0) {
      errors.push(`Series "${series.title}" refers to ${missing.length} label(s) that aren't in the file.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors: capErrors(errors) };

  return {
    ok: true,
    backup: { app: BACKUP_APP_NAME, version, exportedAt, data: { tasks, taskSeries, labels } },
  };
}
