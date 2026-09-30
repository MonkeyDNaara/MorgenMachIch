import type { Label, Task, TaskSeries } from "@/lib/types";

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
 * matches the day the user sees on their own clock. */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${BACKUP_APP_NAME}-backup-${date}.json`;
}
