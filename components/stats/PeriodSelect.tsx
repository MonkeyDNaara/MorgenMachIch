import type { StatsPeriod } from "@/lib/utils/stats";

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
 * drives both the bar chart and the label breakdown (#218).
 */
export default function PeriodSelect({ value, onChange }: PeriodSelectProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Period"
      className="inline-flex rounded-full border border-base-300 bg-base-100 p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`cursor-pointer rounded-full px-3 py-1 text-xs outline-none! transition-colors focus-visible:shadow-[0_0_0_2px_rgba(77,209,224,0.5)] ${
            value === option.value
              ? "bg-base-300 text-base-content"
              : "text-base-content/50 hover:text-base-content"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
