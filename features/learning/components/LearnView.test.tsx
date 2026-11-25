// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Component, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  useRouter: () => ({ replace }),
}));

const TOPIC = {
  id: 7,
  topic: "Closures",
  explanation: "A closure keeps its **scope**.",
  deep_explanation: null,
  status: "learning",
  understood_at: null,
  times_taught: 1,
};
const QUIZ = {
  id: 7,
  questions: [
    { question: "What is captured?", options: ["Scope", "Heap"] },
    { question: "Where?", options: ["Function", "File"] },
    { question: "Why?", options: ["State", "Speed"] },
  ],
};
const RESULT = (passed: boolean) => ({
  id: 7,
  topic: "Closures",
  passed,
  score: passed ? 2 : 1,
  total: 3,
  status: passed ? "understood" : "learning",
  understood_at: passed ? "2026-11-23T09:53:14.250Z" : null,
  results: [
    {
      question: "What is captured?",
      your_answer: "Scope",
      correct_answer: "Scope",
      correct: true,
      why: "Because.",
    },
    {
      question: "Where?",
      your_answer: "File",
      correct_answer: "Function",
      correct: false,
      why: "Functions own it.",
    },
    {
      question: "Why?",
      your_answer: "State",
      correct_answer: "State",
      correct: passed,
      why: "State.",
    },
  ],
});

const REVIEW_TOPIC = {
  ...TOPIC,
  status: "understood",
  understood_at: "2026-11-20T09:00:00.000Z",
  times_taught: 2,
  last_reviewed_at: "2026-11-23T05:00:00.000Z",
};
const EMPTY_REVIEW = { empty: true, reason: "no_understood_topics" };

const fetchMock = vi.fn();

function route(overrides: Record<string, () => Response> = {}) {
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url).replace("/api/learning/", "");
    if (overrides[path]) return overrides[path]();
    const data =
      path === "today" || path === "next"
        ? TOPIC
        : path === "review"
          ? REVIEW_TOPIC
          : path === "deepen"
            ? { id: 7, deep_explanation: "Deeper: lexical scope." }
            : path === "quiz"
              ? QUIZ
              : RESULT(true);
    return Response.json({ data });
  });
}

async function renderView(slot?: "today" | "review") {
  vi.resetModules();
  const LearnView = (await import("@/features/learning/components/LearnView")).default;
  const view = render(<LearnView slot={slot} />);
  return { LearnView, rerender: view.rerender };
}

beforeEach(() => {
  fetchMock.mockReset();
  notFound.mockClear();
  replace.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function toQuiz() {
  await screen.findByRole("heading", { level: 1, name: "Closures" });
  fireEvent.click(screen.getByRole("button", { name: /Start quiz/ }));
  await screen.findByRole("radiogroup", { name: /What is captured/ });
}

function currentStep() {
  const list = screen.getByRole("list", { name: "Progress" });
  return list.querySelector("[aria-current=step]")?.textContent?.replace(/^\d/, "");
}

/** The question groups; the `New | Review` switch is a radiogroup too. */
function questionGroups() {
  return screen.getAllByRole("radiogroup").filter((group) => !within(group).queryByText("Review"));
}

function answerAll() {
  for (const group of questionGroups()) {
    fireEvent.click(within(group).getAllByRole("radio")[0]);
  }
}

describe("LearnView (#467)", () => {
  it("shows the explanation with the stepper on step 1", async () => {
    route();
    await renderView();
    expect(await screen.findByText("scope")).toBeTruthy();
    expect(currentStep()).toBe("Explanation");
    expect(screen.getByRole("button", { name: "Unsure" })).toBeTruthy();
  });

  it("Unsure adds the deeper block and the button disappears", async () => {
    route();
    await renderView();
    await screen.findByText("scope");
    fireEvent.click(screen.getByRole("button", { name: "Unsure" }));
    expect(await screen.findByText(/lexical scope/)).toBeTruthy();
    expect(screen.getByText("Deeper explanation")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Unsure" })).toBeNull();
  });

  it("keeps Submit disabled until every question is answered", async () => {
    route();
    await renderView();
    await toQuiz();
    const submit = screen.getByRole("button", { name: /Submit/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByText("0 / 3 answered")).toBeTruthy();
    answerAll();
    expect(screen.getByText("3 / 3 answered")).toBeTruthy();
    expect(submit.disabled).toBe(false);
  });

  it("selects an option with the arrow keys", async () => {
    route();
    await renderView();
    await toQuiz();
    const group = questionGroups()[0];
    const [first] = within(group).getAllByRole("radio");
    fireEvent.click(first);
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(within(group).getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
  });

  it("a passed result says a new topic comes tomorrow and ends on the dashboard (#490)", async () => {
    route();
    await renderView();
    await toQuiz();
    answerAll();
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(await screen.findByText("Passed")).toBeTruthy();
    expect(screen.getByText("2/3", { exact: false })).toBeTruthy();
    expect(screen.getByText("Your answer:")).toBeTruthy();
    expect(screen.getByText("A new topic comes tomorrow.")).toBeTruthy();
    const back = screen.getByRole("link", { name: /Back to dashboard/ });
    expect(back.className).toContain("btn-primary");
    expect(screen.getByRole("button", { name: /Next topic/ }).className).not.toContain(
      "btn-primary",
    );
    const body = JSON.parse(fetchMock.mock.calls.at(-1)?.[1].body);
    expect(body).toEqual({ id: 7, answers: [0, 0, 0] });
  });

  it("offers Read again and New quiz when not passed", async () => {
    route({ "quiz/answer": () => Response.json({ data: RESULT(false) }) });
    await renderView();
    await toQuiz();
    answerAll();
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(await screen.findByText("Not passed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Next topic/ })).toBeNull();
    expect(screen.queryByText("A new topic comes tomorrow.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Read again/ }));
    expect(screen.getByText("scope")).toBeTruthy();
    expect(currentStep()).toBe("Explanation");
  });

  it("keeps the answers and offers Retry submit when submitting fails", async () => {
    route({
      "quiz/answer": () =>
        Response.json({ error: { code: "x", message: "boom" } }, { status: 422 }),
    });
    await renderView();
    await toQuiz();
    answerAll();
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("3 / 3 answered")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Retry submit/ })).toBeTruthy();
  });

  it("shows the offline state with Retry", async () => {
    route({
      today: () => Response.json({ error: { code: "o", message: "Mac off" } }, { status: 503 }),
    });
    await renderView();
    expect(await screen.findByText("The learning agent is offline")).toBeTruthy();
    route();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    await waitFor(() => expect(screen.getByText("scope")).toBeTruthy());
  });

  it("falls back to not-found when the proxy hides the feature", async () => {
    route({
      today: () => Response.json({ error: { code: "not_found", message: "no" } }, { status: 404 }),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    const LearnView = (await import("@/features/learning/components/LearnView")).default;
    class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? <p>not found</p> : this.props.children;
      }
    }
    render(
      <Boundary>
        <LearnView />
      </Boundary>,
    );
    expect(await screen.findByText("not found")).toBeTruthy();
    expect(notFound).toHaveBeenCalled();
  });
});

describe("LearnView slots (#481)", () => {
  const urls = () => fetchMock.mock.calls.map(([url]) => String(url));

  it("New slot: eyebrow, no New topic in the header (#490), meta from the topic", async () => {
    route();
    await renderView();
    await screen.findByRole("heading", { level: 1, name: "Closures" });
    expect(screen.getByText("Learn · new")).toBeTruthy();
    expect(screen.getByText("learning · taught 1×")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "New topic" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Next topic/ })).toBeNull();
    expect(urls()).toEqual(["/api/learning/today"]);
    expect(screen.getByRole("radio", { name: "New" }).getAttribute("aria-checked")).toBe("true");
  });

  it("Review slot: asks for the review, no New topic, meta with the day it was understood", async () => {
    route();
    await renderView("review");
    await screen.findByRole("heading", { level: 1, name: "Closures" });
    expect(screen.getByText("Learn · review")).toBeTruthy();
    expect(screen.getByText("understood 20 Nov · taught 2×")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "New topic" })).toBeNull();
    expect(urls()).toEqual(["/api/learning/review"]);
    expect(screen.getByRole("radio", { name: "Review" }).getAttribute("aria-checked")).toBe("true");
  });

  it("switching to Review updates the URL without scrolling and loads the review", async () => {
    route();
    await renderView();
    await screen.findByRole("heading", { level: 1, name: "Closures" });
    fireEvent.click(screen.getByRole("radio", { name: "Review" }));
    expect(replace).toHaveBeenCalledWith("/learn?slot=review", { scroll: false });
    expect(await screen.findByText("Learn · review")).toBeTruthy();
    expect(urls()).toContain("/api/learning/review");
    fireEvent.click(screen.getByRole("radio", { name: "New" }));
    expect(replace).toHaveBeenLastCalledWith("/learn", { scroll: false });
    expect(await screen.findByText("Learn · new")).toBeTruthy();
    // Both stores keep their topic: no second request for either slot.
    expect(urls().filter((url) => url.endsWith("/today"))).toHaveLength(1);
    expect(urls().filter((url) => url.endsWith("/review"))).toHaveLength(1);
  });

  it("the arrow keys switch the slot and the focus stays on the switch", async () => {
    route();
    await renderView();
    await screen.findByRole("heading", { level: 1, name: "Closures" });
    const newRadio = screen.getByRole("radio", { name: "New" });
    newRadio.focus();
    fireEvent.keyDown(newRadio, { key: "ArrowRight" });
    expect(replace).toHaveBeenCalledWith("/learn?slot=review", { scroll: false });
    await screen.findByText("Learn · review");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Review" }));
  });

  it("follows the URL when it changes (Back button)", async () => {
    route();
    const { LearnView, rerender } = await renderView();
    await screen.findByText("Learn · new");
    rerender(<LearnView slot="review" />);
    expect(await screen.findByText("Learn · review")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("a passed review ends on Back to dashboard, never on Next topic", async () => {
    route();
    await renderView("review");
    await toQuiz();
    answerAll();
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(await screen.findByText("Passed")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to dashboard/ }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.queryByRole("button", { name: /Next topic/ })).toBeNull();
  });

  it("a failed review keeps Read again and New quiz", async () => {
    route({ "quiz/answer": () => Response.json({ data: RESULT(false) }) });
    await renderView("review");
    await toQuiz();
    answerAll();
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(await screen.findByText("Not passed")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Read again/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /New quiz/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Back to dashboard/ })).toBeNull();
  });

  it("Review empty: hint and a way back, no stepper", async () => {
    route({ review: () => Response.json({ data: EMPTY_REVIEW }) });
    await renderView("review");
    expect(await screen.findByText("Nothing to review yet.")).toBeTruthy();
    expect(screen.getByText("Pass a quiz and the topic comes back here for review.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to dashboard" }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.queryByRole("list", { name: "Progress" })).toBeNull();
  });

  it("offline in the Review slot: its own Retry", async () => {
    route({
      review: () => Response.json({ error: { code: "o", message: "Mac off" } }, { status: 503 }),
    });
    await renderView("review");
    expect(await screen.findByText("The learning agent is offline")).toBeTruthy();
    route();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(await screen.findByText("understood 20 Nov · taught 2×")).toBeTruthy();
  });

  it("an understood New topic after a reload: Start quiz is primary, Next topic secondary", async () => {
    route({
      today: () =>
        Response.json({
          data: { ...TOPIC, status: "understood", understood_at: "2026-11-23T09:53:14.250Z" },
        }),
    });
    await renderView();
    await screen.findByRole("heading", { level: 1, name: "Closures" });
    expect(screen.getByText("understood · taught 1×")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start quiz/ }).className).toContain("btn-primary");
    expect(screen.getByRole("button", { name: /Next topic/ }).className).not.toContain(
      "btn-primary",
    );
  });
});
