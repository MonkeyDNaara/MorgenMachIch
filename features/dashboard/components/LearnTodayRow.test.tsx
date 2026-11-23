// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const TOPIC = {
  id: 7,
  topic: "Stack vs. Heap",
  explanation: "The **stack** holds call frames.\n\nMore.",
  deep_explanation: null,
  status: "learning",
  understood_at: null,
  times_taught: 1,
};
const PASSED = {
  id: 7,
  topic: "Stack vs. Heap",
  passed: true,
  score: 3,
  total: 3,
  results: [],
  status: "understood",
  understood_at: "2026-11-23T09:53:14.250Z",
};
const fetchMock = vi.fn();

async function renderRow() {
  vi.resetModules();
  const Row = (await import("@/features/dashboard/components/LearnTodayRow")).default;
  const { learningStore } = await import("@/features/learning/lib/learningStore");
  render(<Row />);
  return learningStore;
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

describe("LearnTodayRow (#468)", () => {
  it("shows the topic, a plain teaser and the Open link to /learn", async () => {
    await renderRow();
    expect(await screen.findByText("Stack vs. Heap")).toBeTruthy();
    expect(screen.getByText("The stack holds call frames.")).toBeTruthy();
    expect(screen.getByText("daily learning agent")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open/ }).getAttribute("href")).toBe("/learn");
  });

  it("New topic asks for the next topic", async () => {
    await renderRow();
    await screen.findByText("Stack vs. Heap");
    fireEvent.click(screen.getByRole("button", { name: /New topic/ }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/next"))).toBe(true),
    );
  });

  it("shows loading with seconds and no Cancel at first", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await renderRow();
    expect(await screen.findByText("Fetching today’s topic…")).toBeTruthy();
    expect(screen.getByText("0 s")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("shows offline with Retry and recovers", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ error: { code: "learning_offline", message: "x" } }, { status: 503 }),
    );
    await renderRow();
    expect(await screen.findByText("Learning is offline — is the Mac on?")).toBeTruthy();
    fetchMock.mockImplementation(async () => Response.json({ data: TOPIC }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Stack vs. Heap")).toBeTruthy();
  });

  it("shows an error with its code and Reload topic", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ error: { code: "bad_topic", message: "No topic today." } }, { status: 422 }),
    );
    await renderRow();
    expect(await screen.findByText(/No topic today\./)).toBeTruthy();
    expect(screen.getByText("bad_topic")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload topic" })).toBeTruthy();
  });

  it("renders nothing when the proxy hides the feature", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ error: { code: "not_found", message: "no" } }, { status: 404 }),
    );
    await renderRow();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Learn today")).toBeNull());
  });

  it("shows understood with Next topic after a passed quiz in this session", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      Response.json({
        data: String(url).endsWith("/quiz")
          ? { id: 7, questions: [{ question: "Q", options: ["a", "b"] }] }
          : String(url).endsWith("/answer")
            ? PASSED
            : TOPIC,
      }),
    );
    const store = await renderRow();
    await screen.findByText("Stack vs. Heap");
    await store.quiz();
    await store.answer([0]);
    expect(await screen.findByText("understood")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Next topic/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Read again" }).getAttribute("href")).toBe("/learn");
  });
});
