"use client";

import Link from "next/link";
import { ArrowRight, Check, RefreshCw } from "lucide-react";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import LearnLoading from "@/features/learning/components/LearnLoading";
import { useLearning } from "@/features/learning/hooks/useLearning";
import type { LearningSlot } from "@/features/learning/lib/learningStore";
import { learnHref } from "@/features/learning/lib/learnSlot";
import { learnMetaOf } from "@/features/learning/lib/learnMeta";
import { NEW_TOPIC_TOMORROW } from "@/features/learning/lib/learnRhythm";
import { LOADING_LABEL } from "@/features/learning/lib/loadingLabels";
import { CANCEL_AFTER_SECONDS } from "@/features/learning/lib/loadingProgress";
import { teaserOf } from "@/features/learning/lib/teaser";

const SOURCE = "daily learning agent";
const TITLE: Record<LearningSlot, string> = { today: "Learn · new", review: "Learn · review" };
// 44 px touch targets on mobile (DaisyUI's `btn` is 40 px).
const BTN = "min-h-11";

type LearnCardProps = {
  /** `today`: the new topic. `review`: an understood topic to repeat (#479, #480). */
  slot: LearningSlot;
};

/**
 * One Learn card on the dashboard (#480): a topic with its status, a teaser and the way into
 * /learn. Each slot has its own store, so a slow or failing card never blocks the other one.
 * "Understood" comes from the topic's `status` (the agent decides), so it survives a reload.
 * The New topic stays until it is understood; then a new one comes the next day (#490).
 * Only mounted for the learning owner (the server page decides); a 401/404 hides it again.
 */
export default function LearnCard({ slot }: LearnCardProps) {
  const { phase, action, topic, error, elapsedSeconds, next, retry, cancel } = useLearning({
    slot,
  });
  const title = TITLE[slot];

  if (phase === "hidden") return null;

  if (phase === "loading") {
    return (
      <DashboardCard title={title} meta={<span>{elapsedSeconds} s</span>} source={SOURCE}>
        <LearnLoading label={LOADING_LABEL[action ?? slot]} seconds={elapsedSeconds} />
        {elapsedSeconds >= CANCEL_AFTER_SECONDS && (
          <button type="button" onClick={cancel} className={`btn btn-ghost btn-sm mt-2 ${BTN}`}>
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
        title={title}
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
          <button
            type="button"
            onClick={() => void retry()}
            className={`btn btn-sm gap-1.5 ${BTN}`}
          >
            <RefreshCw size={14} aria-hidden />
            {offline ? "Retry" : slot === "review" ? "Reload review" : "Reload topic"}
          </button>
        </div>
      </DashboardCard>
    );
  }

  if (phase === "empty") {
    return (
      <DashboardCard title={title} source={SOURCE}>
        <div className="flex flex-col gap-1">
          <p className="text-[1.25rem] leading-snug font-semibold">Nothing to review yet.</p>
          <p className="text-sm text-muted">
            Pass a quiz and the topic comes back here for review.
          </p>
        </div>
      </DashboardCard>
    );
  }

  if (!topic) return null;

  const meta = learnMetaOf(topic, slot);
  const teaser = teaserOf(topic.explanation);

  return (
    <DashboardCard
      title={title}
      meta={
        meta.understood ? (
          <span className="inline-flex items-center gap-1 text-success">
            {slot === "today" && <Check size={12} aria-hidden />}
            {meta.label}
          </span>
        ) : (
          meta.label
        )
      }
      source={SOURCE}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[1.25rem] leading-snug font-semibold">{topic.topic}</p>
          {teaser && <p className="line-clamp-2 text-sm text-muted">{teaser}</p>}
          {!meta.understood ? (
            <p className="text-xs text-subtle">Explanation and a 3-question quiz · pass with 2</p>
          ) : (
            slot === "today" && <p className="text-xs text-subtle">{NEW_TOPIC_TOMORROW}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {slot === "review" ? (
            <Link href={learnHref("review")} className={`btn btn-primary gap-1.5 ${BTN}`}>
              Open
              <ArrowRight size={14} aria-hidden />
            </Link>
          ) : meta.understood ? (
            <>
              <Link href={learnHref("today")} className={`btn btn-ghost ${BTN}`}>
                Read again
              </Link>
              {/* A deliberate "one more today"; the next topic normally comes tomorrow. */}
              <button
                type="button"
                onClick={() => void next()}
                className={`btn btn-ghost gap-1.5 ${BTN}`}
              >
                Next topic
                <ArrowRight size={14} aria-hidden />
              </button>
            </>
          ) : (
            // No "New topic": a topic stays until it is understood (#490).
            <Link href={learnHref("today")} className={`btn btn-primary gap-1.5 ${BTN}`}>
              Open
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
