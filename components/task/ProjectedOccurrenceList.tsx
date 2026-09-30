import { Repeat } from "lucide-react";
import PriorityDot from "@/components/task/PriorityDot";
import { formatTime } from "@/lib/utils/formatDueDate";
import type { GhostOccurrence } from "@/lib/utils/projectOccurrences";

type ProjectedOccurrenceListProps = {
  ghosts: GhostOccurrence[];
};

/**
 * Read-only list of a day's projected occurrences (#168), shown under
 * the task list in /calendar's day drill-down. These are not tasks yet
 * — they get generated once their day enters the 60-day window — so
 * there is nothing to open, complete or edit here; edit the series
 * from /tasks instead.
 */
export default function ProjectedOccurrenceList({ ghosts }: ProjectedOccurrenceListProps) {
  if (ghosts.length === 0) return null;

  return (
    <section className="mx-6 mb-6 flex flex-col gap-2 rounded-box border border-dashed border-white/10 p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-base-content/50">Projected</h2>
      <ul className="flex flex-col gap-1.5">
        {ghosts.map((ghost) => (
          <li key={`${ghost.seriesId}-${ghost.dueDate}`} className="flex items-center gap-2 text-sm text-base-content/60">
            <Repeat size={12} className="flex-shrink-0" aria-hidden="true" />
            <PriorityDot priority={ghost.priority} />
            <span className="min-w-0 flex-1 truncate">{ghost.title}</span>
            {!ghost.allDay && <span className="text-xs text-base-content/40">{formatTime(ghost.dueDate)}</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-base-content/40">
        Not generated yet — becomes a task when it enters the 60-day window. Edit the series from /tasks.
      </p>
    </section>
  );
}
