/** How old the last export can get before Settings starts nudging. */
export const BACKUP_STALE_AFTER_DAYS = 30;

export type BackupNudge =
  | { kind: "never" }
  | { kind: "stale"; daysAgo: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Decides whether Settings should nudge the user to export, based on the
 * ISO timestamp of their last export (null = never exported). Returns
 * null when the last backup is recent enough that no nudge is needed.
 */
export function getBackupNudge(lastExportedAt: string | null, now: Date = new Date()): BackupNudge | null {
  if (lastExportedAt === null) return { kind: "never" };

  const lastMs = new Date(lastExportedAt).getTime();
  // An unparseable timestamp is treated like never having exported.
  if (Number.isNaN(lastMs)) return { kind: "never" };

  const daysAgo = Math.floor((now.getTime() - lastMs) / DAY_MS);
  return daysAgo >= BACKUP_STALE_AFTER_DAYS ? { kind: "stale", daysAgo } : null;
}
