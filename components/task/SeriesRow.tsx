"use client";

import { Pause, Play, Repeat } from "lucide-react";
import type { Label, TaskSeries } from "@/lib/types";
import { updateTaskSeries } from "@/lib/db/taskSeries";
import { formatRecurrenceRule } from "@/lib/utils/formatRecurrenceRule";
import LabelChip from "@/components/label/LabelChip";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { useSeriesDrawer } from "@/components/task/SeriesDrawerProvider";

type SeriesRowProps = {
  series: TaskSeries;
  labels: Label[];
};

const MAX_VISIBLE_LABELS = 2;

/**
 * One row per recurring series in the /tasks "Recurring" section (#62)
 * — a template, not a generated occurrence, so there's no status circle
 * or skip action here, just the series' own info and a pause/resume
 * toggle. Clicking the title/recurrence area opens the series-edit
 * drawer (#63); the pause/resume button is a separate quick action.
 */
export default function SeriesRow({ series, labels }: SeriesRowProps) {
  const { openSeriesDrawer } = useSeriesDrawer();
  const paused = !series.active;
  // Same priority ring as the task card's status circle (#237); none or paused stays neutral.
  const ringColor = paused ? null : PRIORITY_DOT_COLORS[series.priority];
  const seriesLabels = labels.filter((label) => series.labelIds.includes(label.id));
  const visibleLabels = seriesLabels.slice(0, MAX_VISIBLE_LABELS);
  const overflowCount = seriesLabels.length - visibleLabels.length;

  async function handleToggleActive() {
    await updateTaskSeries(series.id, { active: paused });
  }

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-3 rounded-box border p-3 transition-colors ${
        paused ? "border-line bg-transparent" : "surface-raised border-transparent"
      }`}
    >
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-base-content/30 surface-sunken text-base-content/50"
        style={ringColor ? { borderColor: ringColor } : undefined}
      >
        <Repeat size={12} />
      </span>
      <button
        type="button"
        onClick={() => openSeriesDrawer(series.id)}
        className="min-w-0 flex-1 cursor-pointer text-left outline-none!"
      >
        <span
          className={`block truncate text-body font-medium ${paused ? "text-base-content/50" : ""}`}
        >
          {series.title}
        </span>
        <span className="mt-1 block font-mono text-meta text-base-content/50">
          {formatRecurrenceRule(series.recurrence)}
          {paused ? " · paused" : ""}
        </span>
      </button>
      <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
        {visibleLabels.map((label) => (
          <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
        ))}
        {overflowCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-line-strong px-2 py-0.5 text-[10px] font-medium text-base-content/60">
            +{overflowCount}
          </span>
        )}
        <button
          type="button"
          onClick={handleToggleActive}
          aria-label={paused ? "Resume series" : "Pause series"}
          title={paused ? "Resume series" : "Pause series"}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-base-content/40 outline-none! transition-colors hover:bg-line-strong hover:text-base-content/70"
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
    </div>
  );
}
