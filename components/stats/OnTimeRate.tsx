type OnTimeRateProps = {
  onTime: number;
  total: number;
  rate: number | null;
};

/**
 * On-time rate on /stats (#218): a small ring plus "84%" and
 * "42 of 50 dated tasks" — dated tasks completed on or before their due
 * day (see onTimeRate in lib/utils/stats.ts). Tasks without a due date
 * (the backlog) don't count either way.
 */
export default function OnTimeRate({ onTime, total, rate }: OnTimeRateProps) {
  const percent = rate === null ? null : Math.round(rate * 100);

  return (
    <div className="flex items-center gap-3.5">
      <svg width={56} height={56} viewBox="0 0 36 36" aria-hidden className="shrink-0">
        <circle cx={18} cy={18} r={15.5} fill="none" strokeWidth={4} className="stroke-base-300" />
        {percent !== null && percent > 0 && (
          <circle
            cx={18}
            cy={18}
            r={15.5}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${percent} 100`}
            transform="rotate(-90 18 18)"
            className="stroke-primary"
          />
        )}
      </svg>
      <div>
        <p className="text-xl font-semibold tabular-nums">
          {percent === null ? "—" : `${percent}%`}
        </p>
        <p className="text-xs text-base-content/40">
          {percent === null
            ? "On time · no dated tasks completed yet"
            : `On time · ${onTime} of ${total} dated ${total === 1 ? "task" : "tasks"}`}
        </p>
      </div>
    </div>
  );
}
