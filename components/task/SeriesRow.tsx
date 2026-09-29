"use client";

import { Pause, Play, Repeat } from "lucide-react";
import type { Label, TaskSeries } from "@/lib/types";
import { updateTaskSeries } from "@/lib/db/taskSeries";
import { formatRecurrenceRule } from "@/lib/utils/formatRecurrenceRule";
import LabelChip from "@/components/label/LabelChip";
import PriorityDot from "@/components/task/PriorityDot";

type SeriesRowProps = {
  series: TaskSeries;
  labels: Label[];
};

const MAX_VISIBLE_LABELS = 2;

/**
 * One row per recurring series in the /tasks "Recurring" section (#62)
 * — a template, not a generated occurrence, so there's no status circle
 * or skip action here, just the series' own info and a pause/resume
 * toggle. Deliberately not clickable yet: opening a series to edit its
 * template (title/recurrence/etc.) is #63, not this issue.
 */
export default function SeriesRow({ series, labels }: SeriesRowProps) {
  const paused = !series.active;
  const seriesLabels = labels.filter((label) => series.labelIds.includes(label.id));
  const visibleLabels = seriesLabels.slice(0, MAX_VISIBLE_LABELS);
  const overflowCount = seriesLabels.length - visibleLabels.length;

  async function handleToggleActive() {
    await updateTaskSeries(series.id, { active: paused });
  }

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-3 rounded-box border border-transparent bg-base-200 p-3 shadow-lg shadow-black/20 transition-colors ${
        paused ? "opacity-60" : ""
      }`}
    >
      <Repeat size={16} className="flex-shrink-0 text-base-content/40" />
      <div className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <PriorityDot priority={series.priority} className="flex-shrink-0" />
          <span className="min-w-0 flex-1 truncate">{series.title}</span>
        </span>
        <span className="mt-1 block font-mono text-xs text-base-content/50">
          {formatRecurrenceRule(series.recurrence)}
          {paused ? " · paused" : ""}
        </span>
      </div>
      <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
        {visibleLabels.map((label) => (
          <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
        ))}
        {overflowCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-base-300 px-2 py-0.5 text-[10px] font-medium text-base-content/60">
            +{overflowCount}
          </span>
        )}
        <button
          type="button"
          onClick={handleToggleActive}
          aria-label={paused ? "Resume series" : "Pause series"}
          title={paused ? "Resume series" : "Pause series"}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-base-content/40 outline-none! transition-colors hover:bg-base-300 hover:text-base-content/70"
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
    </div>
  );
}
