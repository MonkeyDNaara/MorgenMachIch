"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { RotateCcw } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { APP_LOCALE } from "@/lib/constants/locale";
import { startOfLocalDay } from "@/lib/utils/stats";

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(APP_LOCALE, { day: "numeric", month: "short", year: "numeric" });

/**
 * "Reset stats" in Settings → Data (#226): sets a stats start date so
 * /stats and the streak badge only count completions from today on. No
 * task is changed, so it is fully reversible with "Count all history
 * again" — which is why that side needs no confirm, while the reset asks
 * once.
 */
export default function StatsResetPanel() {
  const settings = useLiveQuery(() => getSettings(), []);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(statsSince: string | null) {
    setError(null);
    try {
      await updateSettings({ statsSince });
      setConfirming(false);
    } catch {
      setError("Couldn't save — try again.");
    }
  }

  if (settings === undefined) return null;
  const today = startOfLocalDay(new Date()).toISOString();

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold">Stats</h3>
        <p className="text-xs text-base-content/50">
          {settings.statsSince
            ? `Stats count from ${formatDay(settings.statsSince)}. Earlier completions are kept, just not counted.`
            : "Stats count every task you've ever completed."}
        </p>
      </div>

      {settings.statsSince ? (
        <div>
          <button type="button" onClick={() => save(null)} className="btn btn-ghost btn-sm">
            Count all history again
          </button>
        </div>
      ) : confirming ? (
        <div className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <p className="text-xs text-base-content/70">
            Streaks, the heatmap and all charts will start fresh from today ({formatDay(today)}).
            Your tasks are not changed, and you can count all history again at any time.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save(today)} className="btn btn-primary btn-sm">
              Reset stats
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn btn-ghost btn-sm gap-1"
          >
            <RotateCcw size={14} aria-hidden />
            Reset stats…
          </button>
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
