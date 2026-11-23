import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse } from "@/server/auth/requireUser";

/**
 * The real `/api/learning/*` routes (#462) with a fake session, a fake env and a mocked
 * `fetch` to n8n — `handle()`, the owner check, the schemas and the error mapping are
 * the production code.
 */
const OWNER = "0b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b";
const OTHER = "1b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b";
const state = vi.hoisted(() => ({ userId: null as string | null, enabled: true }));

vi.mock("@/server/api/handle", async () => {
  const { createHandler } = await import("@/server/api/handler");
  return {
    handle: createHandler({
      requireUser: async () =>
        state.userId
          ? { ok: true, userId: state.userId, source: "ui" }
          : { ok: false, response: errorResponse(401, "unauthorized", "Sign in to continue.") },
      services: (ctx) => ({ ctx }) as never,
    }),
  };
});

vi.mock("@/server/env", () => ({
  getLearningEnv: () =>
    state.enabled
      ? {
          LEARNING_API_URL: "https://n8n.example/webhook/learning",
          LEARNING_API_KEY: "k".repeat(40),
          LEARNING_OWNER_ID: OWNER,
        }
      : null,
}));

const { GET: today } = await import("@/app/api/learning/today/route");
const { POST: next } = await import("@/app/api/learning/next/route");
const { POST: deepen } = await import("@/app/api/learning/deepen/route");
const { POST: quiz } = await import("@/app/api/learning/quiz/route");
const { POST: answer } = await import("@/app/api/learning/quiz/answer/route");

const noParams = { params: Promise.resolve({}) };
const TOPIC = {
  id: 7,
  topic: "Stack vs. Heap",
  explanation: "…",
  deep_explanation: "",
  status: "learning",
  understood_at: null,
  times_taught: 1,
};
const n8n = vi.fn();

function get(path: string) {
  return new Request(`http://localhost/api/learning/${path}`);
}

function post(path: string, body: unknown = {}) {
  return new Request(`http://localhost/api/learning/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function n8nAnswers(body: unknown, status = 200) {
  n8n.mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

beforeEach(() => {
  state.userId = OWNER;
  state.enabled = true;
  n8n.mockReset();
  vi.stubGlobal("fetch", n8n);
});
afterEach(() => vi.unstubAllGlobals());

describe("/api/learning (#462)", () => {
  it("answers 401 without a session and 404 for other users or while off", async () => {
    state.userId = null;
    expect((await today(get("today"), noParams)).status).toBe(401);
    state.userId = OTHER;
    expect((await today(get("today"), noParams)).status).toBe(404);
    expect((await deepen(post("deepen", { nope: true }), noParams)).status).toBe(404);
    state.userId = OWNER;
    state.enabled = false;
    expect((await today(get("today"), noParams)).status).toBe(404);
    expect(n8n).not.toHaveBeenCalled();
  });

  it("returns today's topic in the envelope, deep_explanation empty → null", async () => {
    n8nAnswers(TOPIC);
    const response = await today(get("today"), noParams);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ data: { ...TOPIC, deep_explanation: null } });
  });

  it("forwards the validated body to n8n", async () => {
    n8nAnswers({ id: 7, questions: [{ question: "Q?", options: ["a", "b", "c"] }] });
    expect((await quiz(post("quiz", { id: 7 }), noParams)).status).toBe(200);
    n8nAnswers({
      id: 7,
      topic: "Stack vs. Heap",
      passed: true,
      score: 3,
      total: 3,
      results: [],
      status: "understood",
      understood_at: "2026-11-23T09:53:14.250Z",
    });
    expect(
      (await answer(post("quiz/answer", { id: 7, answers: [0, 1, 2] }), noParams)).status,
    ).toBe(200);
    const [, init] = n8n.mock.calls.at(-1) as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ id: 7, answers: [0, 1, 2] });
    n8nAnswers(TOPIC);
    expect((await next(post("next"), noParams)).status).toBe(200);
    n8nAnswers({ id: 7, deep_explanation: "Deeper…" });
    expect(await (await deepen(post("deepen", { id: 7 }), noParams)).json()).toEqual({
      data: { id: 7, deep_explanation: "Deeper…" },
    });
  });

  it("refuses invalid bodies before calling n8n", async () => {
    for (const body of [{}, { id: "7" }, { id: 7, source: "claude" }]) {
      const response = await deepen(post("deepen", body), noParams);
      expect(response.status, JSON.stringify(body)).toBe(422);
    }
    expect((await answer(post("quiz/answer", { id: 7, answers: [-1] }), noParams)).status).toBe(
      422,
    );
    expect(n8n).not.toHaveBeenCalled();
  });

  it("passes n8n's JSON 404 for a topic that isn't open as 404", async () => {
    n8nAnswers({ ok: false, error: "topic not in learning" }, 404);
    const response = await deepen(post("deepen", { id: 999999 }), noParams);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
  });

  it("maps n8n being down to 503 learning_offline", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    n8n.mockRejectedValue(new TypeError("fetch failed"));
    const response = await today(get("today"), noParams);
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("learning_offline");
  });
});
