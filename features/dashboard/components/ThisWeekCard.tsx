import Link from "next/link";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import MiniBars from "@/components/ui/charts/MiniBars";
import {
  weekBarsLabel,
  weekComparison,
  type WeekSummary,
} from "@/features/dashboard/lib/weekSummary";
import { APP_LOCALE } from "@/lib/constants/locale";

type ThisWeekCardProps = {
  /** undefined while tasks and settings are still loading. */
  summary: WeekSummary | undefined;
};

/**
 * Dashboard card "This week" (#425): a small /stats — completions per day
 * Monday to Sunday (future days as track), "17 done · 82% on time" over the
 * same days, and how that compares with the same span of last week.
 */
export default function ThisWeekCard({ summary }: ThisWeekCardProps) {
  const rate = summary?.onTime.rate;
  const comparison = summary ? weekComparison(summary) : null;

  return (
    <DashboardCard
      title="This week"
      meta={
        <Link href="/stats" className="text-accent hover:underline">
          Stats →
        </Link>
      }
    >
      {!summary ? (
        <div className="min-h-16" />
      ) : (
        <div className="flex flex-col gap-3">
          <MiniBars
            values={summary.days.map((day) => day.count)}
            highlightIndex={summary.todayIndex}
            labels={summary.days.map((day) =>
              day.date.toLocaleDateString(APP_LOCALE, { weekday: "narrow" }),
            )}
            label={weekBarsLabel(summary)}
            height={48}
          />
          <div>
            <p className="font-mono text-sm">
              {summary.done} done
              <span className="text-muted">
                {" · "}
                {rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`} on time
              </span>
            </p>
            {comparison && <p className="mt-0.5 text-xs text-subtle">{comparison}</p>}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
