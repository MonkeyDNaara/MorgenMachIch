"use client";

import Link from "next/link";
import { ArrowRight, Check, RefreshCw, Shuffle } from "lucide-react";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import LearnLoading from "@/features/learning/components/LearnLoading";
import { useLearning } from "@/features/learning/hooks/useLearning";
import type { LearningAction } from "@/features/learning/lib/learningStore";
import { CANCEL_AFTER_SECONDS } from "@/features/learning/lib/loadingProgress";
import { teaserOf } from "@/features/learning/lib/teaser";

const LOADING_LABEL: Record<LearningAction, string> = {
  today: "Fetching today’s topic…",
  next: "Choosing and writing the next topic…",
  deepen: "Writing a deeper explanation…",
  quiz: "Building your quiz…",
  answer: "Checking your answers…",
  review: "Fetching your review…",
};

const SOURCE = "daily learning agent";

/**
 * Learn today on the dashboard (#468): a full-width row that only teases and routes — reading
 * and the quiz live on /learn. Only mounted for the learning owner (the server page decides),
 * so nobody else ever triggers a learning request. A 401/404 from the proxy hides it again.
 * "Understood" lasts for the session (a passed quiz in the shared store); it isn't stored yet.
 */
export default function LearnTodayRow() {
  const { phase, action, topic, result, error, elapsedSeconds, next, retry, cancel } =
    useLearning();

  if (phase === "hidden") return null;

  if (phase === "loading") {
    return (
      <DashboardCard title="Learn today" meta={<span>{elapsedSeconds} s</span>} source={SOURCE}>
        <LearnLoading label={LOADING_LABEL[action ?? "today"]} seconds={elapsedSeconds} />
        {elapsedSeconds >= CANCEL_AFTER_SECONDS && (
          <button type="button" onClick={cancel} className="btn btn-ghost btn-sm mt-2">
            Cancel
          </button>
        )}
      </DashboardCard>
    );
  }

  if (phase === "offline" || phase === "error") {
    const offline = phase === "offline";
    return (
      <DashboardCard
        title="Learn today"
        meta={
          <span className={offline ? "text-warning" : "text-error"}>
            {offline ? "offline" : "error"}
          </span>
        }
        source={SOURCE}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm ${offline ? "text-muted" : "text-error"}`} role="status">
            {offline ? "Learning is offline — is the Mac on?" : error?.message}
            {!offline && error?.code && (
              <span className="ml-2 font-mono text-meta text-subtle">{error.code}</span>
            )}
          </p>
          <button type="button" onClick={() => void retry()} className="btn btn-sm gap-1.5">
            <RefreshCw size={14} aria-hidden />
            {offline ? "Retry" : "Reload topic"}
          </button>
        </div>
      </DashboardCard>
    );
  }

  if (!topic) return null;

  const understood = result?.passed === true && result.id === topic.id;
  const teaser = teaserOf(topic.explanation);

  return (
    <DashboardCard
      title="Learn today"
      meta={
        understood ? (
          <span className="inline-flex items-center gap-1 text-success">
            <Check size={12} aria-hidden />
            understood
          </span>
        ) : (
          "learning"
        )
      }
      source={SOURCE}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[1.25rem] leading-snug font-semibold">{topic.topic}</p>
          {teaser && <p className="line-clamp-2 text-sm text-muted">{teaser}</p>}
          {!understood && (
            <p className="text-xs text-subtle">Explanation and a 3-question quiz · pass with 2</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {understood ? (
            <>
              <Link href="/learn" className="btn btn-ghost">
                Read again
              </Link>
              <button type="button" onClick={() => void next()} className="btn btn-primary gap-1.5">
                Next topic
                <ArrowRight size={14} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => void next()} className="btn btn-ghost gap-1.5">
                <Shuffle size={14} aria-hidden />
                New topic
              </button>
              <Link href="/learn" className="btn btn-primary gap-1.5">
                Open
                <ArrowRight size={14} aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
