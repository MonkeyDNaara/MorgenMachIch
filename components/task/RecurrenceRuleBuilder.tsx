"use client";

import type { RecurrenceRule } from "@/lib/types";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";

type Frequency = RecurrenceRule["frequency"];

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// Mon-first display order (matches the rest of the app's week
// convention), values stay 0=Sun..6=Sat to match Date.getDay() and the
// RecurrenceRule schema.
const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const NTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];

function pillClasses(active: boolean): string {
  return `cursor-pointer rounded-full px-3 py-1 text-xs font-medium outline-none! transition-colors ${
    active ? "bg-primary text-primary-content" : "bg-base-300 text-base-content/60 hover:text-base-content"
  }`;
}

function intervalUnit(frequency: Frequency): string {
  if (frequency === "daily") return "day";
  if (frequency === "weekly") return "week";
  return "month";
}

type RecurrenceRuleBuilderProps = {
  value: RecurrenceRule;
  onChange: (rule: RecurrenceRule) => void;
};

/**
 * Recurrence rule editor for the task drawer's "Repeat" section (#58).
 * Frequency is a single-select pill row (same idiom as the /tasks
 * status filter pills); weekly's day picker and monthly's mode picker
 * reuse the same pill treatment. Monthly-mode defaults and the
 * day-by-day generation math live in lib/utils/recurrence.ts, not here
 * — this component only edits the rule object it's given.
 */
export default function RecurrenceRuleBuilder({ value, onChange }: RecurrenceRuleBuilderProps) {
  function toggleWeekday(day: number) {
    const current = value.daysOfWeek ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ ...value, daysOfWeek: next });
  }

  return (
    <div className="flex flex-col gap-3 rounded-box border border-white/5 p-3">
      <div className="flex flex-wrap gap-1.5">
        {FREQUENCY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange({ ...value, frequency: option.value })}
            aria-pressed={value.frequency === option.value}
            className={pillClasses(value.frequency === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-base-content/70">
        Every
        <input
          type="number"
          min={1}
          value={value.interval}
          onChange={(event) => onChange({ ...value, interval: Math.max(1, Number(event.target.value)) })}
          className={`input input-sm w-16 ${FIELD_FOCUS}`}
        />
        {intervalUnit(value.frequency)}
        {value.interval !== 1 ? "s" : ""}
      </label>

      {value.frequency === "weekly" && (
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleWeekday(option.value)}
              aria-pressed={(value.daysOfWeek ?? []).includes(option.value)}
              className={pillClasses((value.daysOfWeek ?? []).includes(option.value))}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {value.frequency === "monthly" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ ...value, monthlyMode: "dayOfMonth" })}
              aria-pressed={value.monthlyMode === "dayOfMonth"}
              className={pillClasses(value.monthlyMode === "dayOfMonth")}
            >
              On day
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, monthlyMode: "nthWeekday" })}
              aria-pressed={value.monthlyMode === "nthWeekday"}
              className={pillClasses(value.monthlyMode === "nthWeekday")}
            >
              On the...
            </button>
          </div>

          {value.monthlyMode === "dayOfMonth" && (
            <label className="flex items-center gap-2 text-sm text-base-content/70">
              Day
              <input
                type="number"
                min={1}
                max={31}
                value={value.dayOfMonth ?? 1}
                onChange={(event) =>
                  onChange({ ...value, dayOfMonth: Math.min(31, Math.max(1, Number(event.target.value))) })
                }
                className={`input input-sm w-16 ${FIELD_FOCUS}`}
              />
              of the month
            </label>
          )}

          {value.monthlyMode === "nthWeekday" && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
              <select
                value={value.nthWeekday?.n ?? 1}
                onChange={(event) =>
                  onChange({
                    ...value,
                    nthWeekday: { n: Number(event.target.value), weekday: value.nthWeekday?.weekday ?? 1 },
                  })
                }
                className={`select select-sm ${FIELD_FOCUS}`}
              >
                {NTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={value.nthWeekday?.weekday ?? 1}
                onChange={(event) =>
                  onChange({
                    ...value,
                    nthWeekday: { n: value.nthWeekday?.n ?? 1, weekday: Number(event.target.value) },
                  })
                }
                className={`select select-sm ${FIELD_FOCUS}`}
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-base-content/70">
        Ends
        <input
          type="date"
          value={value.endDate ?? ""}
          onChange={(event) => onChange({ ...value, endDate: event.target.value || null })}
          className={`input input-sm ${FIELD_FOCUS}`}
        />
        <span className="text-xs text-base-content/40">(optional)</span>
      </label>
    </div>
  );
}
