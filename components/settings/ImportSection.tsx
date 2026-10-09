"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Upload } from "lucide-react";
import { exportAll, getDataCounts, importAll, type DataCounts } from "@/lib/db/backup";
import { backupFileName, buildBackup, parseBackup, serializeBackup, type BackupFile } from "@/lib/utils/backup";
import { downloadTextFile } from "@/lib/ui/downloadFile";
import { APP_LOCALE } from "@/lib/constants/locale";

type Stage =
  | { kind: "idle" }
  | { kind: "rejected"; fileName: string; errors: string[] }
  | { kind: "preview"; fileName: string; backup: BackupFile }
  | { kind: "done"; counts: DataCounts; savedSafetyBackup: boolean };

function describe(counts: DataCounts): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return [
    plural(counts.tasks, "task", "tasks"),
    plural(counts.taskSeries, "recurring series", "recurring series"),
    plural(counts.labels, "label", "labels"),
  ].join(" · ");
}

function isEmpty(counts: DataCounts): boolean {
  return counts.tasks === 0 && counts.taskSeries === 0 && counts.labels === 0;
}

/**
 * "Restore from backup" on /settings (#162). Flow: pick a file -> it is
 * parsed and validated as a whole (rejected with a list of problems if
 * anything is wrong) -> a preview compares the file with what's in the app
 * now -> on confirm, the current data is downloaded as a safety backup and
 * then everything is replaced in one transaction.
 */
export default function ImportSection() {
  const currentCounts = useLiveQuery(() => getDataCounts(), []);

  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  // Bumped to remount the file input, so choosing the same file again
  // after a rejection or cancel still fires a change event.
  const [inputKey, setInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    let text: string;
    try {
      text = await file.text();
    } catch {
      setStage({ kind: "rejected", fileName: file.name, errors: ["Couldn't read that file."] });
      setInputKey((key) => key + 1);
      return;
    }

    const result = parseBackup(text);
    setStage(
      result.ok
        ? { kind: "preview", fileName: file.name, backup: result.backup }
        : { kind: "rejected", fileName: file.name, errors: result.errors },
    );
    setInputKey((key) => key + 1);
  }

  function reset() {
    setStage({ kind: "idle" });
    setError(null);
    setInputKey((key) => key + 1);
  }

  async function handleConfirm() {
    if (stage.kind !== "preview" || importing) return;
    setImporting(true);
    setError(null);
    try {
      // Safety net first: if this download can't be produced, nothing has
      // been replaced yet. An empty app has nothing worth saving.
      const current = await exportAll();
      const hasData = current.tasks.length + current.taskSeries.length + current.labels.length > 0;
      if (hasData) {
        const now = new Date();
        downloadTextFile(backupFileName(now, "before-import"), serializeBackup(buildBackup(current, now)));
      }

      await importAll(stage.backup.data);
      setStage({
        kind: "done",
        savedSafetyBackup: hasData,
        counts: {
          tasks: stage.backup.data.tasks.length,
          taskSeries: stage.backup.data.taskSeries.length,
          labels: stage.backup.data.labels.length,
        },
      });
    } catch {
      setError("Import failed — your existing data was not changed. Try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 surface-panel p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Restore from backup</h2>
        <p className="text-xs text-base-content/50">
          Import a backup file exported from this app. It replaces everything currently stored here.
        </p>
      </div>

      {stage.kind === "done" ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-base-content/70">
            Import complete — {describe(stage.counts)} restored.
            {stage.savedSafetyBackup && " Your previous data was downloaded first as a safety backup."}
          </p>
          <button type="button" onClick={reset} className="btn btn-ghost btn-sm self-start">
            Done
          </button>
        </div>
      ) : (
        <>
          {(stage.kind === "idle" || stage.kind === "rejected") && (
            // A styled label instead of the native file button, whose text
            // follows the browser language ("Datei auswählen") (#240).
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn btn-sm cursor-pointer gap-1.5 border-0 bg-base-300 shadow-raised-sm has-[:focus-visible]:shadow-focus">
                <Upload size={14} />
                Choose backup file…
                <input
                  key={inputKey}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <span className="font-mono text-meta text-base-content/50">.json from Export backup</span>
            </div>
          )}

          {stage.kind === "rejected" && (
            <div className="flex flex-col gap-2 rounded-lg border border-error/40 bg-error/5 p-3">
              <p className="text-xs font-medium text-error">
                Couldn&apos;t import {stage.fileName} — nothing was changed.
              </p>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-base-content/70">
                {stage.errors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {stage.kind === "preview" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-lg surface-sunken p-3 font-mono text-xs">
                <p className="text-base-content/50">{stage.fileName}</p>
                <p>
                  <span className="text-base-content/50">In the file: </span>
                  {describe({
                    tasks: stage.backup.data.tasks.length,
                    taskSeries: stage.backup.data.taskSeries.length,
                    labels: stage.backup.data.labels.length,
                  })}
                </p>
                <p className="text-base-content/50">
                  Exported {new Date(stage.backup.exportedAt).toLocaleString(APP_LOCALE, { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p>
                  <span className="text-base-content/50">In the app now: </span>
                  {currentCounts === undefined ? "…" : describe(currentCounts)}
                </p>
              </div>

              <p className="text-xs text-base-content/60">
                {currentCounts !== undefined && isEmpty(currentCounts)
                  ? "The app is empty, so nothing will be overwritten."
                  : "Replacing deletes everything currently in the app. It is downloaded first as a safety backup."}
              </p>

              <div className="flex items-center gap-2">
                <button type="button" onClick={handleConfirm} disabled={importing} className="btn btn-error btn-sm">
                  {importing ? "Importing…" : "Replace everything with this file"}
                </button>
                <button type="button" onClick={reset} disabled={importing} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </section>
  );
}
