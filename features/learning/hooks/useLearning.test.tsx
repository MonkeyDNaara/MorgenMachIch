// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const TOPIC = {
  id: 7,
  topic: "Closures",
  explanation: "A closure keeps its scope.",
  deep_explanation: null,
  status: "learning",
  understood_at: null,
  times_taught: 1,
};

const fetchMock = vi.fn();

/** The hook talks to a module-level store, so every test starts with a fresh module. */
async function loadHook() {
  vi.resetModules();
  return (await import("@/features/learning/hooks/useLearning")).useLearning;
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json({ data: TOPIC }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useLearning (#466)", () => {
  it("loads today's topic once for the row and the page together", async () => {
    const useLearning = await loadHook();
    const row = renderHook(() => useLearning());
    const page = renderHook(() => useLearning());
    expect(row.result.current.phase).toBe("loading");

    await waitFor(() => expect(row.result.current.phase).toBe("ready"));
    expect(page.result.current.topic).toEqual(TOPIC);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/learning/today");
  });

  it("doesn't call the agent when autoLoad is off", async () => {
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning({ autoLoad: false }));
    await act(async () => {});
    expect(result.current.phase).toBe("loading");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("re-renders when an action changes the state", async () => {
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning());
    await waitFor(() => expect(result.current.phase).toBe("ready"));

    fetchMock.mockImplementationOnce(async () =>
      Response.json({ data: { id: 7, deep_explanation: "Deeper." } }),
    );
    await act(async () => {
      await result.current.deepen();
    });
    expect(result.current.topic?.deep_explanation).toBe("Deeper.");
  });

  it("shows offline and recovers with retry", async () => {
    fetchMock.mockImplementationOnce(async () =>
      Response.json({ error: { code: "learning_offline", message: "Offline." } }, { status: 503 }),
    );
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning());
    await waitFor(() => expect(result.current.phase).toBe("offline"));
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.phase).toBe("ready");
  });
});

describe("useLearning state and actions", () => {
  it("keeps the quiz questions in `quiz` and the action in `loadQuiz`", async () => {
    const useLearning = await loadHook();
    const quiz = { id: 7, questions: [{ question: "Q?", options: ["a", "b"] }] };
    fetchMock.mockImplementation(async (url: string) =>
      Response.json({ data: String(url).endsWith("/quiz") ? quiz : TOPIC }),
    );
    const { result } = renderHook(() => useLearning());
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    await act(async () => {
      await result.current.loadQuiz();
    });
    expect(result.current.quiz).toEqual(quiz);
  });
});

const REVIEW_TOPIC = {
  id: 9,
  topic: "Promises",
  explanation: "A value that arrives later.",
  deep_explanation: null,
  status: "understood",
  understood_at: "2026-11-20T09:00:00.000Z",
  times_taught: 2,
  last_reviewed_at: "2026-11-23T05:00:00.000Z",
};

/** Answers by URL, so the order of the two slots doesn't matter. */
function answerByUrl(review: unknown = REVIEW_TOPIC) {
  fetchMock.mockImplementation(async (url: string) =>
    Response.json({ data: url === "/api/learning/review" ? review : TOPIC }),
  );
}

describe("useLearning slots (#479)", () => {
  it("keeps today as the default slot", async () => {
    const useLearning = await loadHook();
    renderHook(() => useLearning());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/learning/today");
  });

  it("loads the review topic with last_reviewed_at in the review slot", async () => {
    answerByUrl();
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning({ slot: "review" }));
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/learning/review");
    expect(result.current.topic).toMatchObject({ id: 9, status: "understood" });
    expect(result.current.lastReviewedAt).toBe(REVIEW_TOPIC.last_reviewed_at);
  });

  it("makes one request per slot and keeps the two states apart", async () => {
    answerByUrl();
    const useLearning = await loadHook();
    const today = renderHook(() => useLearning());
    const review = renderHook(() => useLearning({ slot: "review" }));
    await waitFor(() => {
      expect(today.result.current.phase).toBe("ready");
      expect(review.result.current.phase).toBe("ready");
    });
    expect(fetchMock.mock.calls.map((call) => call[0]).sort()).toEqual([
      "/api/learning/review",
      "/api/learning/today",
    ]);
    expect(today.result.current.topic?.id).toBe(7);
    expect(review.result.current.topic?.id).toBe(9);
  });

  it("shares one review request between two hooks", async () => {
    answerByUrl();
    const useLearning = await loadHook();
    const first = renderHook(() => useLearning({ slot: "review" }));
    const second = renderHook(() => useLearning({ slot: "review" }));
    await waitFor(() => expect(first.result.current.phase).toBe("ready"));
    expect(second.result.current.topic?.id).toBe(9);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the empty phase when there is nothing to review", async () => {
    answerByUrl({ empty: true, reason: "no_understood_topics" });
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning({ slot: "review" }));
    await waitFor(() => expect(result.current.phase).toBe("empty"));
    expect(result.current.topic).toBeNull();
  });

  it("doesn't call the agent in the review slot when autoLoad is off, load does", async () => {
    answerByUrl();
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning({ slot: "review", autoLoad: false }));
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.load();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("ready");
  });
});
