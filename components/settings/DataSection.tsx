"use client";

import { useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download } from "lucide-react";
import { exportAll, getDataCounts } from "@/lib/db/backup";
import { buildBackup, backupFileName, serializeBackup } from "@/lib/utils/backup";
import { getBackupNudge } from "@/lib/utils/backupNudge";
import { downloadTextFile } from "@/lib/ui/downloadFile";
import { readLastExportedAt, subscribeLastExportedAt, writeLastExportedAt } from "@/lib/ui/lastExported";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * The "Data" section of /settings (#161): what's stored, when it was last
 * backed up, and the export button. Import has its own section
 * (ImportSection, #162); delete-all (#163) will get one too.
 */
export default function DataSection() {
  const counts = useLiveQuery(() => getDataCounts(), []);
  // undefined on the server / first client render, then the stored value —
  // useSyncExternalStore keeps that hydration-safe.
  const lastExportedAt = useSyncExternalStore(subscribeLastExportedAt, readLastExportedAt, () => undefined);

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const data = await exportAll();
      const now = new Date();
      downloadTextFile(backupFileName(now), serializeBackup(buildBackup(data, now)));
      writeLastExportedAt(now.toISOString());
    } catch {
      setError("Couldn't export your data — try again.");
    } finally {
      setExporting(false);
    }
  }

  const nudge = lastExportedAt === undefined ? null : getBackupNudge(lastExportedAt);

  return (
    <section className="flex flex-col gap-4 rounded-box bg-base-200 p-4 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Data</h2>
        <p className="text-xs text-base-content/50">
          Everything lives in this browser only. Export a backup so it can be restored if the browser data is ever
          cleared.
        </p>
      </div>

      <p className="font-mono text-xs text-base-content/60">
        {counts === undefined
          ? "Loading…"
          : `${counts.tasks} ${counts.tasks === 1 ? "task" : "tasks"} · ${counts.taskSeries} recurring series · ${counts.labels} ${counts.labels === 1 ? "label" : "labels"}`}
      </p>

      {nudge !== null && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-base-content/70">
          {nudge.kind === "never"
            ? "You haven't exported a backup yet. Clearing this browser's site data would erase everything."
            : `Your last backup is ${nudge.daysAgo} days old — consider exporting a fresh one.`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleExport} disabled={exporting} className="btn btn-primary btn-sm gap-1">
          <Download size={14} />
          {exporting ? "Exporting…" : "Export backup"}
        </button>
        <span className="text-xs text-base-content/50">
          {lastExportedAt === undefined
            ? ""
            : lastExportedAt === null
              ? "Last exported: never"
              : `Last exported: ${formatTimestamp(lastExportedAt)}`}
        </span>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}
    </section>
  );
}
