"use client";

import { useCallback } from "react";
import type { TaskSeries } from "@/lib/types";
import {
  createTaskSeriesWithOccurrences,
  deleteTaskSeriesAndOccurrences,
} from "@/lib/db/taskSeries";
import { formatRecurrenceRule } from "@/lib/utils/formatRecurrenceRule";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";
import { seriesFromQuickAdd } from "@/lib/utils/quickAddSeries";
import { useToast } from "@/components/ui/ToastProvider";
import { newLabelsNote, withNewLabels } from "@/components/quickadd/newLabels";

/**
 * Creates the series a quick-add parse describes (#275) and confirms it
 * with a toast — "Series “Gym” · Every week on Mon, Thu" — whose Undo
 * deletes the series and every task it generated (right after creating
 * there are only open ones). Shared by the quick-add bars and the palette.
 * Resolves to null when the parse has no recurrence; rejects when saving
 * fails, so the caller can keep the typed text. New labels from unknown
 * `#tags` (#283) are created first and named in the toast.
 */
export function useAddSeries(): (result: QuickAddResult) => Promise<TaskSeries | null> {
  const { notify } = useToast();
  return useCallback(
    async (result) => {
      if (!seriesFromQuickAdd(result)) return null;
      const { result: resolved, created } = await withNewLabels(result);
      const series = await createTaskSeriesWithOccurrences(seriesFromQuickAdd(resolved)!);
      const rule = formatRecurrenceRule(series.recurrence);
      notify(`Series “${series.title}” · ${rule}${newLabelsNote(created)}`, {
        action: {
          label: "Undo",
          onAction: () => deleteTaskSeriesAndOccurrences(series.id),
        },
      });
      return series;
    },
    [notify],
  );
}
