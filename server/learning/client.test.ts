import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@/server/api/errors";
import { callLearning } from "@/server/learning/client";

const ENV = {
  LEARNING_API_URL: "https://n8n.example/webhook/learning",
  LEARNING_API_KEY: "k".repeat(40),
  LEARNING_OWNER_ID: "0b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b",
};
const Schema = z.object({ id: z.number(), topic: z.string() });

afterEach(() => vi.restoreAllMocks());

function answer(body: string, status = 200, type = "application/json") {
  return vi.fn(async () => new Response(body, { status, headers: { "Content-Type": type } }));
}

async function failure(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiError);
  const { status, code, message } = error as ApiError;
  return { status, code, message };
}

const OFFLINE = { status: 503, code: "learning_offline" };

describe("callLearning (#462)", () => {
  it("sends GET for today and review, POST with a JSON body otherwise, always with the key", async () => {
    const fetchImpl = answer(JSON.stringify({ id: 1, topic: "Heap", extra: true }));
    expect(await callLearning(ENV, "today", Schema, { fetchImpl })).toEqual({
      id: 1,
      topic: "Heap",
    });
    expect(await callLearning(ENV, "review", Schema, { fetchImpl })).toEqual({
      id: 1,
      topic: "Heap",
    });
    expect(await callLearning(ENV, "quiz/answer", Schema, { fetchImpl, body: { id: 1 } })).toEqual({
      id: 1,
      topic: "Heap",
    });
    const [[todayUrl, today], [reviewUrl, review], [answerUrl, post]] = fetchImpl.mock
      .calls as unknown as [string, RequestInit][];
    expect(todayUrl).toBe("https://n8n.example/webhook/learning/today");
    expect(today.method).toBe("GET");
    expect(today.body).toBeUndefined();
    expect((today.headers as Record<string, string>)["X-Api-Key"]).toBe(ENV.LEARNING_API_KEY);
    expect(reviewUrl).toBe("https://n8n.example/webhook/learning/review");
    expect(review.method).toBe("GET");
    expect(review.body).toBeUndefined();
    expect((review.headers as Record<string, string>)["X-Api-Key"]).toBe(ENV.LEARNING_API_KEY);
    expect(answerUrl).toBe("https://n8n.example/webhook/learning/quiz/answer");
    expect(post.method).toBe("POST");
    expect(post.body).toBe('{"id":1}');
    expect((post.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("passes n8n's JSON 400 and 404 on as 422 and 404", async () => {
    expect(
      await failure(
        callLearning(ENV, "deepen", Schema, { fetchImpl: answer('{"error":"x"}', 400) }),
      ),
    ).toMatchObject({ status: 422, code: "validation" });
    expect(
      await failure(
        callLearning(ENV, "deepen", Schema, { fetchImpl: answer('{"error":"x"}', 404) }),
      ),
    ).toMatchObject({ status: 404, code: "not_found" });
  });

  it("treats offline ngrok (HTML 404), 5xx, a wrong key and bad answers as offline", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const fetchImpl of [
      answer("<html>ERR_NGROK_3200</html>", 404, "text/html"),
      answer('{"message":"boom"}', 500),
      answer("", 403, "text/plain"),
      answer("not json", 200, "application/json"),
      answer(JSON.stringify({ id: "x" })),
    ]) {
      expect(await failure(callLearning(ENV, "today", Schema, { fetchImpl }))).toMatchObject(
        OFFLINE,
      );
    }
  });

  it("treats a network error and a timeout as offline, without leaking the URL or key", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed: n8n.example");
    });
    const error = await failure(callLearning(ENV, "today", Schema, { fetchImpl: down }));
    expect(error).toMatchObject(OFFLINE);
    expect(error.message).not.toMatch(/n8n\.example|kkkk/);

    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)),
      );
    const started = Date.now();
    expect(
      await failure(callLearning(ENV, "today", Schema, { fetchImpl: hang, timeoutMs: 50 })),
    ).toMatchObject(OFFLINE);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(JSON.stringify(log.mock.calls)).not.toContain(ENV.LEARNING_API_KEY);
  });
});
