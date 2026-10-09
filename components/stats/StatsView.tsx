"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import { getLabels } from "@/lib/db/labels";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { APP_LOCALE } from "@/lib/constants/locale";
import {
  applyStatsStart,
  completionsByDay,
  completionsByLabel,
  dailySeries,
  onTimeRate,
  periodStart,
  periodTotals,
  streakSummary,
  weeklySeries,
  yearHeatmap,
  type StatsPeriod,
} from "@/lib/utils/stats";
import StreakHero from "@/components/stats/StreakHero";
import StatCard from "@/components/stats/StatCard";
import YearHeatmap from "@/components/stats/YearHeatmap";
import PeriodSelect from "@/components/stats/PeriodSelect";
import CompletionBarChart from "@/components/stats/CompletionBarChart";
import LabelBreakdown from "@/components/stats/LabelBreakdown";
import OnTimeRate from "@/components/stats/OnTimeRate";

const PERIOD_CAPTIONS = { "7d": "last 7 days", "30d": "last 30 days", all: "all time" } as const;

/**
 * /stats (#215): streak hero + best streak / this week / this month, then
 * the year heatmap (#216), the completions bar chart with its period
 * switch (#217) and, next to it, the label breakdown and on-time rate
 * (#218), which follow the same period. Reads tasks through a live query, so
 * completing a task anywhere updates the numbers right away.
 */
export default function StatsView() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const labels = useLiveQuery(() => getLabels(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const statsSince = settings?.statsSince ?? null;
  // The stats start date (#226) is applied once here; everything below
  // works on the already-filtered list.
  const counted = useMemo(() => applyStatsStart(tasks ?? [], statsSince), [tasks, statsSince]);
  const byDay = useMemo(() => completionsByDay(counted), [counted]);
  // Shared by the bar chart and (#218) the label breakdown.
  const [period, setPeriod] = useState<StatsPeriod>("7d");

  if (tasks === undefined || settings === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  const now = new Date();
  const streak = streakSummary(byDay, now);
  const totals = periodTotals(byDay, now);
  const heatmap = yearHeatmap(byDay, now);
  // "All" is shown per week over the last year; daily bars would be too thin.
  const unit = period === "all" ? "week" : "day";
  const series =
    period === "all"
      ? weeklySeries(byDay, now, 52)
      : dailySeries(byDay, now, period === "7d" ? 7 : 30);
  const seriesTotal = series.reduce((sum, entry) => sum + entry.count, 0);
  const since = periodStart(period, now);
  const byLabel = completionsByLabel(counted, since);
  const onTime = onTimeRate(counted, since);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6">
      <header>
        <h1 className="text-lg font-semibold">Stats</h1>
        <p className="text-xs text-base-content/50">
          {statsSince ? (
            <>
              Counting since{" "}
              {new Date(statsSince).toLocaleDateString(APP_LOCALE, {
                day: "numeric",
                month: "short",
              })}{" "}
              ·{" "}
              <button
                type="button"
                onClick={() => void updateSettings({ statsSince: null })}
                className="cursor-pointer text-primary hover:underline"
              >
                Count all history
              </button>
            </>
          ) : (
            "Built from the tasks you've completed."
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <StreakHero streak={streak} byDay={byDay} todayCount={totals.today} now={now} />
        <div className="grid grid-rows-3 gap-3">
          <StatCard
            label="Best streak"
            value={streak.best}
            unit={streak.best === 1 ? "day" : "days"}
          />
          <StatCard label="This week" value={totals.thisWeek} />
          <StatCard label="This month" value={totals.thisMonth} />
        </div>
      </div>

      <section className="rounded-box bg-base-200 p-4 shadow-raised">
        <h2 className="mb-3 text-sm font-semibold">
          Last 12 months
          <span className="ml-1.5 text-xs font-normal text-base-content/40">
            · {heatmap.total} completed
          </span>
        </h2>
        <YearHeatmap heatmap={heatmap} />
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-box bg-base-200 p-4 shadow-raised">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Completed per {unit}</h2>
            <PeriodSelect value={period} onChange={setPeriod} />
          </div>
          <p className="mb-3 text-xs text-base-content/40">
            {seriesTotal} completed · {(seriesTotal / series.length).toFixed(1)} per {unit}
            {period === "all" && " · last 12 months"}
          </p>
          <CompletionBarChart key={period} series={series} unit={unit} />
        </section>

        <section className="flex flex-col gap-4 rounded-box bg-base-200 p-4 shadow-raised">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">By label</h2>
            <span className="text-xs text-base-content/40">{PERIOD_CAPTIONS[period]}</span>
          </div>
          <LabelBreakdown rows={byLabel} labels={labels ?? []} />
          <div className="mt-auto border-t border-line pt-4">
            <OnTimeRate {...onTime} />
          </div>
        </section>
      </div>

      <p className="text-center text-xs text-base-content/35">
        Stats only count completed tasks that are still in the app — reopening or deleting a task
        removes it here.
      </p>
    </div>
  );
}
