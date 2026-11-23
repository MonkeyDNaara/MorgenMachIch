"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  RefreshCw,
  Shuffle,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Markdown from "@/components/ui/Markdown";
import PageHeader from "@/components/ui/PageHeader";
import LearnActionBar from "@/features/learning/components/LearnActionBar";
import LearnLoading from "@/features/learning/components/LearnLoading";
import LearnQuiz from "@/features/learning/components/LearnQuiz";
import LearnResult from "@/features/learning/components/LearnResult";
import LearnSlotSwitch from "@/features/learning/components/LearnSlotSwitch";
import LearnStepper from "@/features/learning/components/LearnStepper";
import { useLearning } from "@/features/learning/hooks/useLearning";
import type { LearningSlot } from "@/features/learning/lib/learningStore";
import { learnHref } from "@/features/learning/lib/learnSlot";
import { learnMetaOf } from "@/features/learning/lib/learnMeta";
import { LOADING_LABEL } from "@/features/learning/lib/loadingLabels";
import { CANCEL_AFTER_SECONDS } from "@/features/learning/lib/loadingProgress";

const STEP_NAME = ["Explanation", "Quiz", "Result"] as const;

type LearnViewProps = {
  /** From `?slot=` (the server page parses it): `today` = New, `review` = Review. */
  slot?: LearningSlot;
};

/**
 * /learn (#467, #481): a `New | Review` switch above one slot's Explanation → Quiz → Result.
 * The slot is local state so the switch reacts at once; the URL follows (`?slot=review`, no
 * scroll) so the dashboard can deep link and Back works. Each slot has its own store, so
 * switching keeps what has been loaded; the slot view is keyed, so "Read again" and the quiz
 * choices start fresh. The switch lives outside the key, so the keyboard focus stays on it.
 */
export default function LearnView({ slot: slotFromUrl = "today" }: LearnViewProps) {
  const router = useRouter();
  const [slot, setSlot] = useState(slotFromUrl);
  const [seenFromUrl, setSeenFromUrl] = useState(slotFromUrl);
  if (slotFromUrl !== seenFromUrl) {
    // Back/forward or a link changed the URL: follow it.
    setSeenFromUrl(slotFromUrl);
    setSlot(slotFromUrl);
  }

  function changeSlot(next: LearningSlot) {
    if (next === slot) return;
    setSlot(next);
    router.replace(learnHref(next), { scroll: false });
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 pt-8">
        <LearnSlotSwitch slot={slot} onChange={changeSlot} />
      </div>
      <LearnSlotView key={slot} slot={slot} />
    </div>
  );
}

/**
 * One slot of /learn (#467): Explanation → Quiz → Result for the learning owner only (the
 * server page has already checked; a 401/404 from the proxy still falls back to not-found).
 * All state lives in `useLearning({ slot })`, shared with the dashboard card; the only local
 * state is "Read again", which shows step 1 again without touching the store.
 */
function LearnSlotView({ slot }: { slot: LearningSlot }) {
  const learning = useLearning({ slot });
  const { phase, action, topic, quiz, result, error, elapsedSeconds } = learning;
  const [rereading, setRereading] = useState(false);
  // The quiz choices live here (next to the sticky Submit) and survive a failed submit.
  const [answers, setAnswers] = useState<{ quizId: number | null; values: (number | null)[] }>({
    quizId: null,
    values: [],
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef<number | null>(null);

  if (phase === "hidden") notFound();

  const loading = phase === "loading";
  const failed = phase === "offline" || phase === "error";
  const onQuiz = Boolean(quiz) || action === "quiz" || action === "answer";
  const step: 0 | 1 | 2 = rereading ? 0 : result ? 2 : onQuiz ? 1 : 0;

  // Move focus to the new step so keyboard and screen reader users land on its content.
  useEffect(() => {
    if (previousStep.current !== null && previousStep.current !== step) panelRef.current?.focus();
    previousStep.current = step;
  }, [step]);

  function startQuiz() {
    setRereading(false);
    void learning.loadQuiz();
  }

  function nextTopic() {
    setRereading(false);
    void learning.next();
  }

  const cancel = loading && elapsedSeconds >= CANCEL_AFTER_SECONDS && (
    <button type="button" onClick={learning.cancel} className="btn btn-ghost">
      Cancel
    </button>
  );

  const meta: ReactNode = loading ? (
    <span className="font-mono text-meta text-muted">{elapsedSeconds} s</span>
  ) : phase === "offline" ? (
    <span className="font-mono text-meta text-warning">offline</span>
  ) : phase === "error" ? (
    <span className="font-mono text-meta text-error">error</span>
  ) : step === 2 && result ? (
    <span className={`font-mono text-meta ${result.passed ? "text-success" : "text-error"}`}>
      {result.passed ? "understood" : "not passed"}
    </span>
  ) : step === 1 && quiz ? (
    <span className="font-mono text-meta text-muted">quiz · {quiz.questions.length} questions</span>
  ) : step === 0 && topic ? (
    <span
      className={`font-mono text-meta ${learnMetaOf(topic, slot).understood ? "text-success" : "text-muted"}`}
    >
      {learnMetaOf(topic, slot).label}
    </span>
  ) : null;

  const picked = answers.quizId === quiz?.id ? answers.values : [];
  const answeredCount = quiz ? quiz.questions.filter((_, i) => picked[i] != null).length : 0;

  let body: ReactNode;
  let bar: ReactNode = null;

  if (failed && !(action === "answer" && quiz)) {
    const offline = phase === "offline";
    body = (
      <div className="flex flex-col items-center gap-2">
        <EmptyState
          icon={offline ? WifiOff : TriangleAlert}
          title={offline ? "The learning agent is offline" : "Something went wrong"}
          hint={error?.message}
        />
        <button type="button" onClick={() => void learning.retry()} className="btn btn-sm gap-1.5">
          <RefreshCw size={14} aria-hidden />
          {offline ? "Retry" : slot === "review" ? "Reload review" : "Reload topic"}
        </button>
      </div>
    );
  } else if (loading && action !== "deepen" && action !== "answer") {
    body = <LearnLoading label={LOADING_LABEL[action ?? slot]} seconds={elapsedSeconds} />;
    bar = cancel && <LearnActionBar>{cancel}</LearnActionBar>;
  } else if (phase === "empty") {
    body = (
      <div className="flex flex-col items-center gap-2">
        <EmptyState
          icon={BookOpen}
          title="Nothing to review yet."
          hint="Pass a quiz and the topic comes back here for review."
        />
        <Link href="/dashboard" className="btn btn-sm min-h-11">
          Back to dashboard
        </Link>
      </div>
    );
  } else if (step === 2 && result) {
    body = <LearnResult result={result} />;
    bar = (
      <LearnActionBar>
        <div className="ml-auto flex items-center gap-2">
          {result.passed && slot === "review" ? (
            // "Next topic" would replace today's topic; the review ends on the dashboard.
            <Link href="/dashboard" className="btn btn-primary gap-1.5">
              Back to dashboard
              <ArrowRight size={14} aria-hidden />
            </Link>
          ) : result.passed ? (
            <button type="button" onClick={nextTopic} className="btn btn-primary gap-1.5">
              Next topic
              <ArrowRight size={14} aria-hidden />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRereading(true)}
                className="btn btn-ghost gap-1.5"
              >
                <BookOpen size={14} aria-hidden />
                Read again
              </button>
              <button type="button" onClick={startQuiz} className="btn btn-primary gap-1.5">
                <RefreshCw size={14} aria-hidden />
                New quiz
              </button>
            </>
          )}
        </div>
      </LearnActionBar>
    );
  } else if (step === 1 && quiz) {
    const submitting = loading && action === "answer";
    body = (
      <LearnQuiz
        quiz={quiz}
        answers={quiz.questions.map((_, i) => picked[i] ?? null)}
        locked={submitting}
        failed={failed}
        onSelect={(question, option) => {
          const values = quiz.questions.map((_, i) => picked[i] ?? null);
          values[question] = option;
          setAnswers({ quizId: quiz.id, values });
        }}
      />
    );
    bar = (
      <LearnActionBar>
        <span className="font-mono text-meta text-muted" aria-live="polite">
          {answeredCount} / {quiz.questions.length} answered
        </span>
        <div className="ml-auto flex items-center gap-2">
          {cancel}
          {failed ? (
            <button
              type="button"
              onClick={() => void learning.retry()}
              className="btn btn-primary gap-1.5"
            >
              <RefreshCw size={14} aria-hidden />
              Retry submit
            </button>
          ) : (
            <button
              type="button"
              disabled={answeredCount < quiz.questions.length || submitting}
              onClick={() => void learning.answer(picked as number[])}
              className="btn btn-primary gap-1.5"
            >
              {submitting ? "Submitting…" : "Submit"}
              {!submitting && <ArrowRight size={14} aria-hidden />}
            </button>
          )}
        </div>
      </LearnActionBar>
    );
  } else if (topic) {
    const deepening = loading && action === "deepen";
    // A topic the agent already marked understood (after a reload): practice, or move on.
    const understoodNew = slot === "today" && topic.status === "understood";
    body = (
      <div className="flex flex-col gap-6">
        <Markdown text={topic.explanation} />
        {(topic.deep_explanation || deepening) && (
          <section className="rounded-r-field border-l-2 border-accent bg-accent/10 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-mono text-eyebrow text-accent uppercase">Deeper explanation</h2>
              {deepening && (
                <span className="font-mono text-meta text-muted">{elapsedSeconds} s</span>
              )}
            </div>
            {topic.deep_explanation && <Markdown text={topic.deep_explanation} />}
            {deepening && <LearnLoading label={LOADING_LABEL.deepen} seconds={elapsedSeconds} />}
          </section>
        )}
      </div>
    );
    bar = (
      <LearnActionBar>
        {!topic.deep_explanation && (
          <button
            type="button"
            disabled={deepening}
            onClick={() => void learning.deepen()}
            className="btn gap-1.5"
          >
            <CircleHelp size={14} aria-hidden />
            {deepening ? "Asking the agent…" : "Unsure"}
          </button>
        )}
        {cancel}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={deepening}
            onClick={startQuiz}
            className={`btn gap-1.5 ${understoodNew ? "" : "btn-primary"}`}
          >
            Start quiz
            {!understoodNew && <ArrowRight size={14} aria-hidden />}
          </button>
          {understoodNew && (
            <button
              type="button"
              disabled={deepening}
              onClick={nextTopic}
              className="btn btn-primary gap-1.5"
            >
              Next topic
              <ArrowRight size={14} aria-hidden />
            </button>
          )}
        </div>
      </LearnActionBar>
    );
  } else {
    body = <LearnLoading label={LOADING_LABEL[slot]} seconds={elapsedSeconds} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pt-6 pb-8">
        <PageHeader
          eyebrow={slot === "review" ? "Learn · review" : "Learn · new"}
          title={topic?.topic ?? (slot === "review" ? "Review topic" : "Today’s topic")}
          meta={meta}
          actions={
            // Review never replaces today's topic, so only New has a "New topic".
            slot === "today" ? (
              <button
                type="button"
                aria-label="New topic"
                disabled={loading}
                onClick={nextTopic}
                className="btn btn-ghost btn-sm gap-1.5"
              >
                <Shuffle size={14} aria-hidden />
                <span className="hidden sm:inline">New topic</span>
              </button>
            ) : undefined
          }
        />
        {phase !== "empty" && <LearnStepper step={step} />}
      </div>
      <div
        ref={panelRef}
        tabIndex={-1}
        aria-labelledby="learn-step-title"
        className="flex flex-1 flex-col outline-none"
      >
        <h2 id="learn-step-title" className="sr-only">
          {STEP_NAME[step]}
        </h2>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-8">
          <div className="surface-panel flex flex-col gap-6 p-5 md:p-6">{body}</div>
        </div>
        {bar}
      </div>
    </div>
  );
}
