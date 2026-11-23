// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Component, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

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

const fetchMock = vi.fn();

function route(overrides: Record<string, () => Response> = {}) {
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url).replace("/api/learning/", "");
    if (overrides[path]) return overrides[path]();
    const data =
      path === "today" || path === "next"
        ? TOPIC
        : path === "deepen"
          ? { id: 7, deep_explanation: "Deeper: lexical scope." }
          : path === "quiz"
            ? QUIZ
            : RESULT(true);
    return Response.json({ data });
  });
}

async function renderView() {
  vi.resetModules();
  const LearnView = (await import("@/features/learning/components/LearnView")).default;
  render(<LearnView />);
}

beforeEach(() => {
  fetchMock.mockReset();
  notFound.mockClear();
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

function answerAll() {
  for (const group of screen.getAllByRole("radiogroup")) {
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
    const group = screen.getAllByRole("radiogroup")[0];
    const [first] = within(group).getAllByRole("radio");
    fireEvent.click(first);
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(within(group).getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
  });

  it("sends the answers and shows a passed result with Next topic", async () => {
    route();
    await renderView();
    await toQuiz();
    answerAll();
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(await screen.findByText("Passed")).toBeTruthy();
    expect(screen.getByText("2/3", { exact: false })).toBeTruthy();
    expect(screen.getByText("Your answer:")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Next topic/ })).toBeTruthy();
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
