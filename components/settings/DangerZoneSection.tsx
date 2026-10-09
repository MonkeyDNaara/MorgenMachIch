"use client";

import { useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { deleteAllData, getDataCounts } from "@/lib/db/backup";
import { getBackupNudge } from "@/lib/utils/backupNudge";
import { readLastExportedAt, subscribeLastExportedAt } from "@/lib/ui/lastExported";

/**
 * "Danger zone" on /settings (#163): wipe every task, series and label.
 * The confirm step shows exactly what will be removed and, if there's no
 * recent backup, nudges towards exporting first (reusing the timestamp
 * from #161). The delete itself is a single transaction (deleteAllData).
 */
export default function DangerZoneSection() {
  const counts = useLiveQuery(() => getDataCounts(), []);
  const lastExportedAt = useSyncExternalStore(subscribeLastExportedAt, readLastExportedAt, () => undefined);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = counts !== undefined && counts.tasks === 0 && counts.taskSeries === 0 && counts.labels === 0;
  const nudge = lastExportedAt === undefined ? null : getBackupNudge(lastExportedAt);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAllData();
      setConfirming(false);
      setDeleted(true);
    } catch {
      setError("Couldn't delete your data — nothing was changed. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  function startConfirm() {
    setDeleted(false);
    setError(null);
    setConfirming(true);
  }

  return (
    <section className="flex flex-col gap-4 surface-panel border-error/40 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-mono text-eyebrow text-error uppercase">Danger zone</h2>
        <p className="text-xs text-base-content/50">
          Permanently delete all tasks, recurring series and labels from this browser.
        </p>
      </div>

      {deleted && (
        <p className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-base-content/70">
          All data deleted.
        </p>
      )}

      {confirming && counts !== undefined ? (
        <div className="flex flex-col gap-3 rounded-lg bg-base-300 p-3">
          <p className="text-xs text-base-content/70">
            This permanently deletes{" "}
            <span className="font-mono text-base-content">
              {counts.tasks} {counts.tasks === 1 ? "task" : "tasks"}, {counts.taskSeries} recurring series and{" "}
              {counts.labels} {counts.labels === 1 ? "label" : "labels"}
            </span>
            . It can&apos;t be undone.
          </p>

          {nudge !== null && (
            <p className="text-xs text-error">
              {nudge.kind === "never"
                ? "You haven't exported a backup yet — export one above first."
                : `Your last backup is ${nudge.daysAgo} days old — consider exporting a fresh one above first.`}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-error btn-sm">
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startConfirm}
            disabled={counts === undefined || isEmpty}
            className="btn btn-outline btn-error btn-sm gap-1"
          >
            <Trash2 size={14} />
            Delete all data
          </button>
          {isEmpty && <span className="text-xs text-base-content/50">Nothing to delete.</span>}
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </section>
  );
}
