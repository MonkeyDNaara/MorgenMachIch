// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TOPIC = {
  id: 7,
  topic: "Stack vs. Heap",
  explanation: "The **stack** holds call frames.\n\nMore.",
  deep_explanation: null,
  status: "learning",
  understood_at: null,
  times_taught: 1,
};
const REVIEW = {
  id: 9,
  topic: "Promises",
  explanation: "A value that arrives *later*.",
  deep_explanation: null,
  status: "understood",
  understood_at: "2026-11-12T09:00:00.000Z",
  times_taught: 2,
  last_reviewed_at: "2026-11-23T05:00:00.000Z",
};
const EMPTY = { empty: true, reason: "no_understood_topics" };
const QUIZ = (id: number) => ({ id, questions: [{ question: "Q", options: ["a", "b"] }] });
const RESULT = (id: number, patch = {}) => ({
  id,
  topic: "x",
  passed: true,
  score: 3,
  total: 3,
  results: [],
  status: "understood",
  understood_at: "2026-11-23T09:53:14.250Z",
  ...patch,
});
const fetchMock = vi.fn();

type Answers = { today?: unknown; review?: unknown; answer?: (id: number) => unknown };

/** Answers by URL (the two cards ask in parallel); a value can also be a ready `Response`. */
function answerByUrl({ today = TOPIC, review = REVIEW, answer }: Answers = {}) {
  const reply = (data: unknown) => (data instanceof Response ? data : Response.json({ data }));
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const path = String(url);
    if (path.endsWith("/today")) return reply(today);
    if (path.endsWith("/review")) return reply(review);
    const { id } = init?.body ? JSON.parse(String(init.body)) : { id: 0 };
    if (path.endsWith("/quiz")) return reply(QUIZ(id));
    if (path.endsWith("/answer") && answer) return reply(answer(id));
    return reply(TOPIC);
  });
}

async function renderRow() {
  vi.resetModules();
  const Row = (await import("@/features/dashboard/components/LearnTodayRow")).default;
  const { learningStores } = await import("@/features/learning/lib/learningStore");
  render(<Row />);
  return learningStores;
}

const offline = () =>
  Response.json({ error: { code: "learning_offline", message: "x" } }, { status: 503 });

beforeEach(() => {
  fetchMock.mockReset();
  answerByUrl();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LearnTodayRow: the New and Review cards (#480)", () => {
  it("shows both cards with topic, teaser, source and the links into /learn", async () => {
    await renderRow();
    expect(await screen.findByText("Stack vs. Heap")).toBeTruthy();
    expect(await screen.findByText("Promises")).toBeTruthy();
    expect(screen.getByText("Learn · new")).toBeTruthy();
    expect(screen.getByText("Learn · review")).toBeTruthy();
    expect(screen.getByText("The stack holds call frames.")).toBeTruthy();
    expect(screen.getAllByText("daily learning agent")).toHaveLength(2);
    const open = screen.getAllByRole("link", { name: /Open/ });
    expect(open.map((link) => link.getAttribute("href"))).toEqual(["/learn", "/learn?slot=review"]);
  });

  it("asks both agents once: today and review", async () => {
    await renderRow();
    await screen.findByText("Promises");
    expect(fetchMock.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      "/api/learning/review",
      "/api/learning/today",
    ]);
  });

  it("a not-understood New topic stays: no New or Next topic on either card (#490)", async () => {
    await renderRow();
    await screen.findByText("Promises");
    expect(screen.queryByRole("button", { name: /New topic/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Next topic/ })).toBeNull();
    expect(screen.queryByText("A new topic comes tomorrow.")).toBeNull();
    expect(screen.getByText("Explanation and a 3-question quiz · pass with 2")).toBeTruthy();
  });

  it("meta: New learning, Review with the day it was understood", async () => {
    await renderRow();
    expect(await screen.findByText("learning · taught 1×")).toBeTruthy();
    expect(await screen.findByText("understood 12 Nov · taught 2×")).toBeTruthy();
  });

  it("shows understood on the New card after a reload (status from the agent)", async () => {
    answerByUrl({ today: { ...TOPIC, status: "understood", understood_at: REVIEW.understood_at } });
    await renderRow();
    expect(await screen.findByText("understood · taught 1×")).toBeTruthy();
    expect(screen.getByText("A new topic comes tomorrow.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Read again" }).getAttribute("href")).toBe("/learn");
    // "Next topic" is a deliberate extra, not the primary action (#490).
    const next = screen.getByRole("button", { name: /Next topic/ });
    expect(next.className).not.toContain("btn-primary");
    fireEvent.click(next);
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/next"))).toBe(true),
    );
  });

  it("a passed quiz in this session makes the New topic understood without a reload", async () => {
    answerByUrl({ answer: (id) => RESULT(id) });
    const stores = await renderRow();
    await screen.findByText("Stack vs. Heap");
    await act(async () => {
      await stores.today.quiz();
      await stores.today.answer([0]);
    });
    expect(await screen.findByText("understood · taught 1×")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Next topic/ })).toBeTruthy();
    expect(screen.getByText("A new topic comes tomorrow.")).toBeTruthy();
  });

  it("a failed review quiz sets the Review topic back to learning", async () => {
    answerByUrl({ answer: (id) => RESULT(id, { passed: false, score: 0, status: "learning" }) });
    const stores = await renderRow();
    await screen.findByText("understood 12 Nov · taught 2×");
    await act(async () => {
      await stores.review.quiz();
      await stores.review.answer([1]);
    });
    expect(await screen.findByText("learning · taught 2×")).toBeTruthy();
  });

  it("Review empty: the card stays with a hint", async () => {
    answerByUrl({ review: EMPTY });
    await renderRow();
    expect(await screen.findByText("Nothing to review yet.")).toBeTruthy();
    expect(screen.getByText("Pass a quiz and the topic comes back here for review.")).toBeTruthy();
    expect(screen.getByText("Stack vs. Heap")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Open/ })).toHaveLength(1);
  });
});

describe("LearnTodayRow: loading, offline, error and hidden per card", () => {
  it("shows loading with seconds on both cards and no Cancel at first", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await renderRow();
    expect(await screen.findByText("Fetching today’s topic…")).toBeTruthy();
    expect(screen.getByText("Fetching your review…")).toBeTruthy();
    expect(screen.getAllByText("0 s")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("offers Cancel on each card after 15 s", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await renderRow();
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(2);
  });

  it("Mac off: both cards are offline with Retry, and recover", async () => {
    fetchMock.mockImplementation(async () => offline());
    await renderRow();
    await waitFor(() =>
      expect(screen.getAllByText("Learning is offline — is the Mac on?")).toHaveLength(2),
    );
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(2);
    answerByUrl();
    for (const retry of screen.getAllByRole("button", { name: "Retry" })) fireEvent.click(retry);
    expect(await screen.findByText("Stack vs. Heap")).toBeTruthy();
    expect(await screen.findByText("Promises")).toBeTruthy();
  });

  it("an error on one card leaves the other one working", async () => {
    answerByUrl({
      today: Response.json(
        { error: { code: "bad_topic", message: "No topic today." } },
        { status: 422 },
      ),
    });
    await renderRow();
    expect(await screen.findByText(/No topic today\./)).toBeTruthy();
    expect(screen.getByText("bad_topic")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload topic" })).toBeTruthy();
    expect(await screen.findByText("Promises")).toBeTruthy();
  });

  it("renders nothing when the proxy hides the feature", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ error: { code: "not_found", message: "no" } }, { status: 404 }),
    );
    await renderRow();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("Learn · new")).toBeNull());
    expect(screen.queryByText("Learn · review")).toBeNull();
  });
});
