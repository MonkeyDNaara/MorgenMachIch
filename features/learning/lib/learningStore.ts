import type { z } from "zod";
import {
  LearningDeepenSchema,
  LearningQuizResultSchema,
  LearningQuizSchema,
  LearningReviewSchema,
  LearningTopicSchema,
  type LearningQuiz,
  type LearningQuizResult,
  type LearningReview,
  type LearningTopic,
} from "@/lib/types/learning";

/** The calls of the learning proxy (#462, `review` #479). */
export type LearningAction = "today" | "next" | "deepen" | "quiz" | "answer" | "review";

/** What a store loads first: today's new topic, or an understood topic for review (#479). */
export type LearningSlot = "today" | "review";

/**
 * - `loading`: a request is in flight (`action` says which; `elapsedSeconds` counts up)
 * - `ready`: the last request worked; `topic` (and `quiz` / `result`) are current
 * - `offline`: the agent isn't reachable (proxy 503, network error, or Cancel on the first load)
 * - `empty`: review slot only, there is no understood topic yet (`topic` is null)
 * - `error`: the agent refused or failed (`error` has the code and message)
 * - `hidden`: not signed in or not the owner (proxy 401/404); render nothing
 */
export type LearningPhase = "loading" | "ready" | "empty" | "offline" | "error" | "hidden";

export type LearningError = { code: string; message: string };

export type LearningState = {
  phase: LearningPhase;
  /** The request in flight, or the one that just failed (what Retry repeats). */
  action: LearningAction | null;
  topic: LearningTopic | null;
  /** Review slot: when the agent first showed this topic for review today; otherwise null. */
  lastReviewedAt: string | null;
  quiz: LearningQuiz | null;
  result: LearningQuizResult | null;
  error: LearningError | null;
  /** Whole seconds since the request in flight started; 0 otherwise. */
  elapsedSeconds: number;
};

export const INITIAL_LEARNING_STATE: LearningState = {
  phase: "loading",
  action: null,
  topic: null,
  lastReviewedAt: null,
  quiz: null,
  result: null,
  error: null,
  elapsedSeconds: 0,
};

export type LearningStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => LearningState;
  getServerSnapshot: () => LearningState;
  /** Loads the slot's topic unless one is shown (or the review is empty) or a request is running. */
  ensureLoaded: () => Promise<void>;
  /** Loads the slot's topic again: today's topic, or the review topic in the review slot. */
  today: () => Promise<void>;
  /** A new topic; does nothing in the review slot (it must never replace today's topic). */
  next: () => Promise<void>;
  deepen: () => Promise<void>;
  quiz: () => Promise<void>;
  /** One option index per question. */
  answer: (answers: number[]) => Promise<void>;
  /** Repeats the request that failed. */
  retry: () => Promise<void>;
  /** Aborts the request in flight (client side; the server stops at its own timeout). */
  cancel: () => void;
};

type Spec = {
  action: LearningAction;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  schema: z.ZodType<unknown>;
  /** What a successful answer changes, given the state at that moment. */
  apply: (data: never, state: LearningState) => Partial<LearningState>;
};

type Outcome =
  | { kind: "ok"; data: unknown }
  | { kind: "hidden" }
  | { kind: "offline"; error: LearningError }
  | { kind: "error"; error: LearningError }
  | { kind: "aborted" };

const OFFLINE: LearningError = {
  code: "learning_offline",
  message: "Learning is offline. Is the Mac on?",
};
const FAILED: LearningError = {
  code: "request_failed",
  message: "The request failed. Try again shortly.",
};

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** `{ error: { code, message } }` of the API's error contract, when the body has it. */
function errorOf(json: unknown): LearningError | null {
  const error = (json as { error?: { code?: unknown; message?: unknown } } | undefined)?.error;
  return typeof error?.code === "string" && typeof error.message === "string"
    ? { code: error.code, message: error.message }
    : null;
}

type StoreOptions = { fetchImpl?: typeof fetch; slot?: LearningSlot };

/**
 * The shared state of the Learn today row and the /learn page (#466): one request at a time,
 * one module-level store (`useSyncExternalStore`), so both see the same topic without a second
 * `learning/today` call. The UI only talks to `useLearning()`; when TanStack Query arrives
 * (#314) this can be swapped out behind that hook.
 *
 * Rules (decided in #466):
 * - `401` → `hidden`. `404` → `hidden` until a request has worked once (the proxy answers 404
 *   to everyone but the owner); after that a 404 means the topic is gone → `error`.
 * - `503` and network errors → `offline`; JSON `422` → `error` with the server's message.
 * - A second call while a request runs does nothing (a double click) and returns the same promise.
 * - Cancel restores the earlier phase; without a topic to go back to it shows `offline`.
 * - Two stores, one per slot (#479), so a slow `today` doesn't block the review.
 */
export function createLearningStore({
  fetchImpl,
  slot = "today",
}: StoreOptions = {}): LearningStore {
  const doFetch: typeof fetch = (input, init) => (fetchImpl ?? fetch)(input, init);
  let state = INITIAL_LEARNING_STATE;
  const listeners = new Set<() => void>();
  let ownerKnown = false;
  let lastSpec: Spec | null = null;
  let flight: {
    controller: AbortController;
    before: LearningState;
    startedAt: number;
    timer: ReturnType<typeof setInterval>;
    promise: Promise<void>;
  } | null = null;

  function set(patch: Partial<LearningState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }

  async function execute(spec: Spec, signal: AbortSignal): Promise<Outcome> {
    let response: Response;
    try {
      response = await doFetch(`/api/learning/${spec.path}`, {
        method: spec.method,
        // The API wants JSON on every write (CSRF check, #455), also without a body.
        headers: spec.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
        cache: "no-store",
        credentials: "same-origin",
        signal,
      });
    } catch {
      return signal.aborted ? { kind: "aborted" } : { kind: "offline", error: OFFLINE };
    }
    const json = await readJson(response);
    if (signal.aborted) return { kind: "aborted" };

    if (response.ok) {
      const parsed = spec.schema.safeParse((json as { data?: unknown } | undefined)?.data);
      return parsed.success
        ? { kind: "ok", data: parsed.data }
        : {
            kind: "error",
            error: {
              code: "bad_response",
              message: "The learning agent sent an unexpected answer.",
            },
          };
    }
    const error = errorOf(json);
    if (response.status === 401) return { kind: "hidden" };
    if (response.status === 404 && !ownerKnown) return { kind: "hidden" };
    if (response.status === 503) return { kind: "offline", error: error ?? OFFLINE };
    return { kind: "error", error: error ?? FAILED };
  }

  function finish(own: NonNullable<typeof flight>, outcome: Outcome, spec: Spec) {
    if (flight !== own) return; // cancelled meanwhile
    clearInterval(own.timer);
    flight = null;
    switch (outcome.kind) {
      case "ok":
        ownerKnown = true;
        set({
          phase: "ready", // a spec may override it (`empty`)
          ...spec.apply(outcome.data as never, state),
          action: null,
          error: null,
          elapsedSeconds: 0,
        });
        break;
      case "hidden":
        set({ ...INITIAL_LEARNING_STATE, phase: "hidden" });
        break;
      case "offline":
        set({ phase: "offline", error: outcome.error, elapsedSeconds: 0 });
        break;
      case "error":
        set({ phase: "error", error: outcome.error, elapsedSeconds: 0 });
        break;
      case "aborted":
        break;
    }
  }

  function start(spec: Spec): Promise<void> {
    if (flight) return flight.promise;
    lastSpec = spec;
    const controller = new AbortController();
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      if (elapsed !== state.elapsedSeconds) set({ elapsedSeconds: elapsed });
    }, 1000);
    const own = {
      controller,
      before: state,
      startedAt,
      timer,
      promise: Promise.resolve(),
    };
    flight = own;
    set({ phase: "loading", action: spec.action, error: null, elapsedSeconds: 0 });
    own.promise = execute(spec, controller.signal).then((outcome) => finish(own, outcome, spec));
    return own.promise;
  }

  const TODAY: Spec = {
    action: "today",
    method: "GET",
    path: "today",
    schema: LearningTopicSchema,
    apply: (topic: LearningTopic) => ({ topic, lastReviewedAt: null, quiz: null, result: null }),
  };

  const REVIEW: Spec = {
    action: "review",
    method: "GET",
    path: "review",
    schema: LearningReviewSchema,
    apply: (data: LearningReview) => {
      if ("empty" in data) {
        return { phase: "empty", topic: null, lastReviewedAt: null, quiz: null, result: null };
      }
      const { last_reviewed_at: lastReviewedAt, ...topic } = data;
      return { topic, lastReviewedAt, quiz: null, result: null };
    },
  };

  const FIRST = slot === "review" ? REVIEW : TODAY;

  const NEXT: Spec = {
    action: "next",
    method: "POST",
    path: "next",
    schema: LearningTopicSchema,
    apply: TODAY.apply,
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getServerSnapshot: () => INITIAL_LEARNING_STATE,

    ensureLoaded() {
      if (flight) return flight.promise;
      if (state.phase === "ready" || state.phase === "empty") return Promise.resolve();
      return start(FIRST);
    },
    today: () => start(FIRST),
    next: () => (slot === "review" ? Promise.resolve() : start(NEXT)),

    deepen() {
      const { topic } = state;
      // Once there is a deeper explanation, asking again would only spend another LLM call.
      if (flight || !topic || topic.deep_explanation) return flight?.promise ?? Promise.resolve();
      return start({
        action: "deepen",
        method: "POST",
        path: "deepen",
        body: { id: topic.id },
        schema: LearningDeepenSchema,
        apply: (data: { id: number; deep_explanation: string }, current) => ({
          topic:
            current.topic && current.topic.id === data.id
              ? { ...current.topic, deep_explanation: data.deep_explanation }
              : current.topic,
        }),
      });
    },

    quiz() {
      const { topic } = state;
      if (flight || !topic) return flight?.promise ?? Promise.resolve();
      return start({
        action: "quiz",
        method: "POST",
        path: "quiz",
        body: { id: topic.id },
        schema: LearningQuizSchema,
        apply: (quiz: LearningQuiz) => ({ quiz, result: null }),
      });
    },

    answer(answers) {
      const { quiz, result } = state;
      // One attempt per quiz (#462): a new quiz has to be loaded first.
      if (flight || !quiz || result) return flight?.promise ?? Promise.resolve();
      return start({
        action: "answer",
        method: "POST",
        path: "quiz/answer",
        body: { id: quiz.id, answers },
        schema: LearningQuizResultSchema,
        apply: (data: LearningQuizResult, current) => ({
          result: data,
          // The agent decides: a pass makes the topic `understood`, a fail sets it back to
          // `learning` (`understood_at` stays). `times_taught` counts deliveries, not quizzes.
          topic:
            current.topic && current.topic.id === data.id
              ? { ...current.topic, status: data.status, understood_at: data.understood_at }
              : current.topic,
        }),
      });
    },

    retry() {
      if (flight || !lastSpec || (state.phase !== "offline" && state.phase !== "error")) {
        return flight?.promise ?? Promise.resolve();
      }
      return start(lastSpec);
    },

    cancel() {
      if (!flight) return;
      const own = flight;
      flight = null;
      clearInterval(own.timer);
      own.controller.abort();
      const { before } = own;
      if (
        before.phase === "ready" ||
        before.phase === "empty" ||
        before.phase === "offline" ||
        before.phase === "error"
      ) {
        set({ phase: before.phase, action: before.action, error: before.error, elapsedSeconds: 0 });
      } else {
        set({
          phase: "offline",
          error: { code: "cancelled", message: "Cancelled." },
          elapsedSeconds: 0,
        });
      }
    },
  };
}

/** The stores the app uses, one per slot; tests create their own with `createLearningStore`. */
export const learningStores: Record<LearningSlot, LearningStore> = {
  today: createLearningStore({ slot: "today" }),
  review: createLearningStore({ slot: "review" }),
};

/** The Today store (#466 name), kept so existing imports keep working. */
export const learningStore = learningStores.today;
