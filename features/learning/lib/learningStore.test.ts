import { afterEach, describe, expect, it, vi } from "vitest";
import { createLearningStore } from "@/features/learning/lib/learningStore";

const TOPIC = {
  id: 7,
  topic: "Closures",
  explanation: "A closure keeps its scope.",
  deep_explanation: null,
  status: "learning",
  understood_at: null,
  times_taught: 1,
};
const NEXT_TOPIC = {
  id: 8,
  topic: "Event loop",
  explanation: "One thread, a queue.",
  deep_explanation: null,
  status: "learning",
  understood_at: null,
  times_taught: 1,
};
const QUIZ = {
  id: 7,
  questions: [
    { question: "Q1", options: ["a", "b", "c"] },
    { question: "Q2", options: ["a", "b"] },
    { question: "Q3", options: ["a", "b", "c", "d"] },
  ],
};
const RESULT = {
  id: 7,
  topic: "Closures",
  passed: true,
  score: 3,
  total: 3,
  results: [
    { question: "Q1", your_answer: "a", correct_answer: "a", correct: true, why: "Because." },
  ],
  status: "understood",
  understood_at: "2026-11-23T09:53:14.250Z",
};

const ok = (data: unknown) => Response.json({ data });
const fail = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });
const html = (status: number) =>
  new Response("<html>nope</html>", { status, headers: { "content-type": "text/html" } });

type Call = { url: string; init: RequestInit };

/** A fetch whose answers the test hands out one by one; aborting rejects like the browser. */
function controlledFetch({ ignoreAbort = false } = {}) {
  const calls: Call[] = [];
  const waiting: Array<{
    resolve: (response: Response) => void;
    reject: (error: unknown) => void;
  }> = [];
  const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Promise<Response>((resolve, reject) => {
      const entry = { resolve, reject };
      waiting.push(entry);
      // Like the browser, an aborted request rejects and is no longer waiting for an answer.
      // `ignoreAbort` models a response that is already on its way when Cancel is pressed.
      init?.signal?.addEventListener("abort", () => {
        if (ignoreAbort) return;
        waiting.splice(waiting.indexOf(entry), 1);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  }) as unknown as typeof fetch;
  return {
    fetchImpl,
    calls,
    /** Answers the oldest request that is still waiting. */
    answer(response: Response) {
      waiting.shift()!.resolve(response);
    },
    networkError() {
      waiting.shift()!.reject(new TypeError("Failed to fetch"));
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A store that already shows `TOPIC`. */
async function readyStore() {
  const net = controlledFetch();
  const store = createLearningStore({ fetchImpl: net.fetchImpl });
  const done = store.ensureLoaded();
  net.answer(ok(TOPIC));
  await done;
  return { net, store };
}

afterEach(() => vi.useRealTimers());

describe("learning store: loading today's topic (#466)", () => {
  it("starts in loading, asks for today and ends ready with the topic", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    expect(store.getSnapshot().phase).toBe("loading");
    expect(store.getSnapshot().action).toBeNull();

    const done = store.ensureLoaded();
    expect(store.getSnapshot()).toMatchObject({ phase: "loading", action: "today" });
    expect(net.calls).toHaveLength(1);
    expect(net.calls[0].url).toBe("/api/learning/today");
    expect(net.calls[0].init.method).toBe("GET");

    net.answer(ok(TOPIC));
    await done;
    expect(store.getSnapshot()).toMatchObject({
      phase: "ready",
      action: null,
      topic: TOPIC,
      error: null,
    });
  });

  it("shares one request between the row and the page", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const first = store.ensureLoaded();
    const second = store.ensureLoaded();
    expect(second).toBe(first);
    net.answer(ok(TOPIC));
    await first;
    expect(net.calls).toHaveLength(1);
    // Mounting again later with a topic on screen does not call the agent again.
    await store.ensureLoaded();
    expect(net.calls).toHaveLength(1);
  });

  it("ignores a double click while a request runs", async () => {
    const { net, store } = await readyStore();
    const first = store.next();
    const second = store.next();
    store.deepen();
    store.quiz();
    expect(second).toBe(first);
    expect(net.calls).toHaveLength(2); // today + one next
    net.answer(ok(NEXT_TOPIC));
    await first;
    expect(store.getSnapshot().topic).toEqual(NEXT_TOPIC);
  });

  it("tells subscribers about every change until they unsubscribe", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const done = store.ensureLoaded();
    expect(listener).toHaveBeenCalledTimes(1); // loading
    net.answer(ok(TOPIC));
    await done;
    expect(listener).toHaveBeenCalledTimes(2); // ready
    unsubscribe();
    const again = store.next();
    net.answer(ok(NEXT_TOPIC));
    await again;
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("serves the initial state on the server", () => {
    const store = createLearningStore();
    expect(store.getServerSnapshot()).toMatchObject({ phase: "loading", topic: null });
  });
});

describe("learning store: offline, hidden and errors (#466)", () => {
  it("goes offline on a 503 and recovers with Retry", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const first = store.ensureLoaded();
    net.answer(fail(503, "learning_offline", "Learning is offline. Is the Mac on?"));
    await first;
    expect(store.getSnapshot()).toMatchObject({
      phase: "offline",
      action: "today",
      error: { code: "learning_offline" },
    });

    const retry = store.retry();
    expect(store.getSnapshot().phase).toBe("loading");
    net.answer(ok(TOPIC));
    await retry;
    expect(store.getSnapshot()).toMatchObject({ phase: "ready", topic: TOPIC, error: null });
    expect(net.calls.map((call) => call.url)).toEqual([
      "/api/learning/today",
      "/api/learning/today",
    ]);
  });

  it("goes offline when the network fails", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const done = store.ensureLoaded();
    net.networkError();
    await done;
    expect(store.getSnapshot().phase).toBe("offline");
  });

  it("repeats the failed request on Retry, not today's topic", async () => {
    const { net, store } = await readyStore();
    const next = store.next();
    net.answer(fail(503, "learning_offline", "Learning is offline. Is the Mac on?"));
    await next;
    expect(store.getSnapshot()).toMatchObject({ phase: "offline", action: "next", topic: TOPIC });
    const retry = store.retry();
    net.answer(ok(NEXT_TOPIC));
    await retry;
    expect(net.calls.at(-1)?.url).toBe("/api/learning/next");
    expect(store.getSnapshot().topic).toEqual(NEXT_TOPIC);
  });

  it("ignores Retry when nothing failed", async () => {
    const { net, store } = await readyStore();
    await store.retry();
    expect(net.calls).toHaveLength(1);
  });

  it("is hidden on a 401", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const done = store.ensureLoaded();
    net.answer(fail(401, "unauthorized", "Sign in to continue."));
    await done;
    expect(store.getSnapshot()).toMatchObject({ phase: "hidden", topic: null, error: null });
  });

  it("is hidden on a 404 before anything worked (not the owner)", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const done = store.ensureLoaded();
    net.answer(fail(404, "not_found", "There is no such endpoint."));
    await done;
    expect(store.getSnapshot().phase).toBe("hidden");
  });

  it("tries again after hidden when the page mounts again (e.g. after signing in)", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const first = store.ensureLoaded();
    net.answer(fail(401, "unauthorized", "Sign in to continue."));
    await first;
    const second = store.ensureLoaded();
    net.answer(ok(TOPIC));
    await second;
    expect(store.getSnapshot()).toMatchObject({ phase: "ready", topic: TOPIC });
  });

  it("treats a 404 after a working request as a missing topic, not as hidden", async () => {
    const { net, store } = await readyStore();
    const deepen = store.deepen();
    net.answer(fail(404, "not_found", "That learning topic doesn't exist."));
    await deepen;
    expect(store.getSnapshot()).toMatchObject({
      phase: "error",
      error: { code: "not_found", message: "That learning topic doesn't exist." },
      topic: TOPIC,
    });
  });

  it("shows the server's message for a 422", async () => {
    const { net, store } = await readyStore();
    const quiz = store.quiz();
    net.answer(fail(422, "validation", "The learning agent refused the request."));
    await quiz;
    expect(store.getSnapshot()).toMatchObject({
      phase: "error",
      action: "quiz",
      error: { code: "validation", message: "The learning agent refused the request." },
    });
  });

  it("falls back to a generic error for an answer without the error contract", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const done = store.ensureLoaded();
    net.answer(html(500));
    await done;
    expect(store.getSnapshot()).toMatchObject({
      phase: "error",
      error: { code: "request_failed" },
    });
  });

  it("rejects an answer that doesn't match the schema", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const done = store.ensureLoaded();
    net.answer(ok({ id: "seven" }));
    await done;
    expect(store.getSnapshot()).toMatchObject({ phase: "error", error: { code: "bad_response" } });
    expect(store.getSnapshot().topic).toBeNull();
  });

  it("keeps topic, quiz and result when a later request fails", async () => {
    const { net, store } = await readyStore();
    const quiz = store.quiz();
    net.answer(ok(QUIZ));
    await quiz;
    const answer = store.answer([0, 1, 2]);
    net.answer(fail(503, "learning_offline", "Learning is offline. Is the Mac on?"));
    await answer;
    expect(store.getSnapshot()).toMatchObject({ phase: "offline", topic: TOPIC, quiz: QUIZ });
  });
});

describe("learning store: the five calls (#466)", () => {
  it("deepen sends the topic id and merges the deeper explanation", async () => {
    const { net, store } = await readyStore();
    const done = store.deepen();
    expect(net.calls.at(-1)?.url).toBe("/api/learning/deepen");
    expect(net.calls.at(-1)?.init.method).toBe("POST");
    expect(net.calls.at(-1)?.init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(net.calls.at(-1)?.init.body))).toEqual({ id: 7 });
    net.answer(ok({ id: 7, deep_explanation: "Deeper." }));
    await done;
    expect(store.getSnapshot().topic).toEqual({ ...TOPIC, deep_explanation: "Deeper." });

    await store.deepen(); // already deeper: no second LLM call
    expect(net.calls).toHaveLength(2);
  });

  it("quiz and answer: ids, answers, then the result", async () => {
    const { net, store } = await readyStore();
    const quiz = store.quiz();
    expect(JSON.parse(String(net.calls.at(-1)?.init.body))).toEqual({ id: 7 });
    net.answer(ok(QUIZ));
    await quiz;
    expect(store.getSnapshot()).toMatchObject({ quiz: QUIZ, result: null });

    const answer = store.answer([0, 1, 3]);
    expect(net.calls.at(-1)?.url).toBe("/api/learning/quiz/answer");
    expect(JSON.parse(String(net.calls.at(-1)?.init.body))).toEqual({ id: 7, answers: [0, 1, 3] });
    net.answer(ok(RESULT));
    await answer;
    expect(store.getSnapshot()).toMatchObject({ phase: "ready", result: RESULT });
  });

  it("allows one attempt per quiz; a new quiz clears the result", async () => {
    const { net, store } = await readyStore();
    let step = store.quiz();
    net.answer(ok(QUIZ));
    await step;
    step = store.answer([0, 0, 0]);
    net.answer(ok(RESULT));
    await step;
    const calls = net.calls.length;
    await store.answer([0, 0, 0]);
    expect(net.calls).toHaveLength(calls);

    step = store.quiz();
    net.answer(ok(QUIZ));
    await step;
    expect(store.getSnapshot().result).toBeNull();
  });

  it("does nothing for deepen, quiz and answer without a topic or quiz", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    await store.deepen();
    await store.quiz();
    await store.answer([0]);
    expect(net.calls).toHaveLength(0);
  });

  it("next replaces the topic and drops quiz and result", async () => {
    const { net, store } = await readyStore();
    let step = store.quiz();
    net.answer(ok(QUIZ));
    await step;
    step = store.next();
    expect(net.calls.at(-1)?.url).toBe("/api/learning/next");
    expect(net.calls.at(-1)?.init.method).toBe("POST");
    net.answer(ok(NEXT_TOPIC));
    await step;
    expect(store.getSnapshot()).toMatchObject({ topic: NEXT_TOPIC, quiz: null, result: null });
  });
});

describe("learning store: cancel and elapsed seconds (#466)", () => {
  it("aborts the request and goes back to ready when a topic is on screen", async () => {
    const { net, store } = await readyStore();
    const next = store.next();
    store.cancel();
    expect(net.calls.at(-1)?.init.signal?.aborted).toBe(true);
    expect(store.getSnapshot()).toMatchObject({ phase: "ready", action: null, topic: TOPIC });
    await next;
    expect(store.getSnapshot().topic).toEqual(TOPIC);
  });

  it("ignores a late answer to a cancelled request", async () => {
    const net = controlledFetch({ ignoreAbort: true });
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    void store.ensureLoaded();
    store.cancel();
    const second = store.today();
    net.answer(ok(TOPIC)); // answers the first, already cancelled request: nobody listens
    await settle();
    expect(store.getSnapshot().phase).toBe("loading");
    net.answer(ok(NEXT_TOPIC));
    await second;
    expect(store.getSnapshot().topic).toEqual(NEXT_TOPIC);
  });

  it("shows offline with a Retry after cancelling the first load", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const first = store.ensureLoaded();
    store.cancel();
    await first;
    expect(store.getSnapshot()).toMatchObject({
      phase: "offline",
      action: "today",
      error: { code: "cancelled" },
    });
    const retry = store.retry();
    net.answer(ok(TOPIC));
    await retry;
    expect(store.getSnapshot()).toMatchObject({ phase: "ready", topic: TOPIC });
  });

  it("returns to the earlier error phase when Retry is cancelled", async () => {
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const first = store.ensureLoaded();
    net.answer(fail(503, "learning_offline", "Learning is offline. Is the Mac on?"));
    await first;
    store.retry();
    store.cancel();
    expect(store.getSnapshot()).toMatchObject({
      phase: "offline",
      error: { code: "learning_offline" },
    });
  });

  it("does nothing on Cancel without a request", async () => {
    const { store } = await readyStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.cancel();
    expect(listener).not.toHaveBeenCalled();
  });

  it("counts elapsed seconds while loading and resets them afterwards", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    const net = controlledFetch();
    const store = createLearningStore({ fetchImpl: net.fetchImpl });
    const done = store.ensureLoaded();
    expect(store.getSnapshot().elapsedSeconds).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(store.getSnapshot().elapsedSeconds).toBe(1);
    vi.advanceTimersByTime(21_000);
    expect(store.getSnapshot().elapsedSeconds).toBe(22);
    net.answer(ok(TOPIC));
    await done;
    expect(store.getSnapshot()).toMatchObject({ phase: "ready", elapsedSeconds: 0 });
    vi.advanceTimersByTime(5000);
    expect(store.getSnapshot().elapsedSeconds).toBe(0);
  });

  it("stops counting when the request is cancelled", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    const { net, store } = await readyStore();
    void net;
    void store.next();
    vi.advanceTimersByTime(3000);
    expect(store.getSnapshot().elapsedSeconds).toBe(3);
    store.cancel();
    vi.advanceTimersByTime(5000);
    expect(store.getSnapshot().elapsedSeconds).toBe(0);
  });
});
