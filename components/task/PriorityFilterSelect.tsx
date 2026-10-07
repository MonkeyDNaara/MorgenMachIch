"use client";

import type { PriorityFilter } from "@/lib/utils/filterTasksByPriority";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";

const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

type PriorityFilterSelectProps = {
  value: PriorityFilter;
  onChange: (priority: PriorityFilter) => void;
};

/**
 * Single-select priority filter dropdown (#140), extracted out of
 * TaskListToolbar (#171) so /tasks, /today and /calendar share one set
 * of options instead of each carrying its own copy.
 */
export default function PriorityFilterSelect({ value, onChange }: PriorityFilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as PriorityFilter)}
      aria-label="Filter by priority"
      className={`select select-sm ${FIELD_FOCUS}`}
    >
      {PRIORITY_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
