"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import { getSettings } from "@/lib/db/settings";
import PageHeader from "@/components/ui/PageHeader";
import DashboardBand from "@/features/dashboard/components/DashboardBand";
import ImportantCard from "@/features/dashboard/components/ImportantCard";
import YesterdayCard from "@/features/dashboard/components/YesterdayCard";
import ThisWeekCard from "@/features/dashboard/components/ThisWeekCard";
import { importantItems } from "@/features/dashboard/lib/importantItems";
import { yesterdayReview } from "@/features/dashboard/lib/yesterdayReview";
import { weekSummary } from "@/features/dashboard/lib/weekSummary";

/**
 * /dashboard (#465, epic #419): the first page of the app — the briefing band
 * (Important, Yesterday, This week) and nothing else; today's tasks live on
 * /today. Learn today (#468) will join as a full-width second row through the
 * band's `wide` slot.
 */
export default function DashboardView() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const now = new Date();
  const important = tasks ? importantItems(tasks, now) : undefined;
  const yesterday = tasks ? yesterdayReview(tasks, now) : undefined;
  // The stats start date (#226) applies here too, so the numbers match /stats.
  const week = tasks && settings ? weekSummary(tasks, now, settings.statsSince ?? null) : undefined;

  return (
    <div className="flex flex-col">
      <PageHeader className="mx-auto w-full max-w-5xl px-6 pt-8" title="Dashboard" />
      <DashboardBand
        important={<ImportantCard items={important} />}
        widgets={[
          { id: "yesterday", node: <YesterdayCard review={yesterday} /> },
          { id: "this-week", node: <ThisWeekCard summary={week} /> },
        ]}
      />
    </div>
  );
}
