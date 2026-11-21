import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/errors";
import { created, isJsonContentType, noContent, ok, readJson } from "@/server/api/json";

function post(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/v1/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

async function failure(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiError);
  const { status, code } = error as ApiError;
  return { status, code };
}

describe("isJsonContentType (#455)", () => {
  it("accepts application/json with parameters, nothing else", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("Application/JSON; charset=utf-8")).toBe(true);
    for (const type of [null, "", "text/plain", "application/x-www-form-urlencoded"]) {
      expect(isJsonContentType(type), String(type)).toBe(false);
    }
  });
});

describe("readJson", () => {
  it("parses a JSON body", async () => {
    expect(await readJson(post(JSON.stringify({ title: "Bäcker" })))).toEqual({ title: "Bäcker" });
  });

  it("answers 415 for another content type", async () => {
    expect(await failure(readJson(post("{}", { "Content-Type": "text/plain" })))).toEqual({
      status: 415,
      code: "unsupported_media_type",
    });
  });

  it("answers 400 for an empty body, broken JSON or invalid UTF-8", async () => {
    for (const body of [null, "", "{", new Uint8Array([0x7b, 0xff, 0x7d])]) {
      expect(await failure(readJson(post(body)))).toEqual({ status: 400, code: "invalid_json" });
    }
  });

  it("answers 413 above the limit, by the declared length or while reading", async () => {
    const big = JSON.stringify({ text: "x".repeat(200) });
    expect(await failure(readJson(post(big), { maxBytes: 100 }))).toEqual({
      status: 413,
      code: "payload_too_large",
    });
    // A streamed body has no Content-Length: the limit applies while reading.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 5; i++) controller.enqueue(new TextEncoder().encode("x".repeat(40)));
        controller.close();
      },
    });
    const request = new Request("http://localhost/api/v1/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await failure(readJson(request, { maxBytes: 100 }))).toEqual({
      status: 413,
      code: "payload_too_large",
    });
  });
});

describe("success responses", () => {
  it("wraps data in the envelope and never caches", async () => {
    const plain = ok({ id: "app" });
    expect(plain.status).toBe(200);
    expect(plain.headers.get("Cache-Control")).toBe("no-store");
    expect(await plain.json()).toEqual({ data: { id: "app" } });
    expect(await ok([], { cursor: "c" }).json()).toEqual({ data: [], meta: { cursor: "c" } });
  });

  it("answers 201 with Location and 204 without a body", async () => {
    const response = created({ id: "l1" }, "/api/v1/labels/l1");
    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toBe("/api/v1/labels/l1");
    const empty = noContent();
    expect(empty.status).toBe(204);
    expect(await empty.text()).toBe("");
  });
});
