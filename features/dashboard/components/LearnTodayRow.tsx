"use client";

import LearnCard from "@/features/dashboard/components/LearnCard";

/**
 * Learn on the dashboard (#468, #480): a full-width row with two cards — **New** (today's topic)
 * and **Review** (an understood topic to repeat). Side by side from md, stacked below it with
 * Review under New. The cards only tease and route; reading and the quiz live on /learn. Only
 * mounted for the learning owner (the server page decides), so nobody else ever triggers a
 * learning request.
 */
export default function LearnTodayRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LearnCard slot="today" />
      <LearnCard slot="review" />
    </div>
  );
}
