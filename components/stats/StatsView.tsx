"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import { completionsByDay, periodTotals, streakSummary, yearHeatmap } from "@/lib/utils/stats";
import StreakHero from "@/components/stats/StreakHero";
import StatCard from "@/components/stats/StatCard";
import YearHeatmap from "@/components/stats/YearHeatmap";

/**
 * /stats (#215): streak hero + best streak / this week / this month, then
 * the year heatmap (#216). The bar chart (#217) and the label breakdown
 * (#218) are added below in their own issues. Reads tasks through a live query, so
 * completing a task anywhere updates the numbers right away.
 */
export default function StatsView() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const byDay = useMemo(() => completionsByDay(tasks ?? []), [tasks]);

  if (tasks === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  const now = new Date();
  const streak = streakSummary(byDay, now);
  const totals = periodTotals(byDay, now);
  const heatmap = yearHeatmap(byDay, now);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6">
      <header>
        <h1 className="text-lg font-semibold">Stats</h1>
        <p className="text-xs text-base-content/50">Built from the tasks you&apos;ve completed.</p>
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

      <section className="rounded-box bg-base-200 p-4 shadow-lg shadow-black/20">
        <h2 className="mb-3 text-sm font-semibold">
          Last 12 months
          <span className="ml-1.5 text-xs font-normal text-base-content/40">
            · {heatmap.total} completed
          </span>
        </h2>
        <YearHeatmap heatmap={heatmap} />
      </section>

      <p className="text-center text-xs text-base-content/35">
        Stats only count completed tasks that are still in the app — reopening or deleting a task
        removes it here.
      </p>
    </div>
  );
}
