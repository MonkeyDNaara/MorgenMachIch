"use client";

import type { StatsPeriod } from "@/features/stats/lib/stats";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";

const OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All" },
];

type PeriodSelectProps = {
  value: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
};

/**
 * Segmented 7 days / 30 days / All switch (#217). One instance on /stats
 * drives both the bar chart and the label breakdown (#218). Keyboard: one
 * tab stop, arrow keys and Home/End change the period (#272).
 */
export default function PeriodSelect({ value, onChange }: PeriodSelectProps) {
  const radios = useRadioGroupKeys({
    count: OPTIONS.length,
    selectedIndex: OPTIONS.findIndex((option) => option.value === value),
    onSelect: (index) => onChange(OPTIONS[index].value),
  });

  return (
    <div
      role="radiogroup"
      aria-label="Period"
      {...radios.groupProps}
      className="inline-flex rounded-full surface-sunken p-0.5"
    >
      {OPTIONS.map((option, index) => (
        <button
          key={option.value}
          {...radios.itemProps(index)}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`cursor-pointer rounded-full px-3 py-1 text-xs outline-none! transition-colors focus-visible:shadow-focus ${
            value === option.value
              ? "bg-base-300 text-base-content shadow-raised-sm"
              : "text-subtle hover:text-base-content"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
