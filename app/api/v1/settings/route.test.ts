import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/server/db/types";
import { createTestDb, createTestUser } from "@/server/test/db";

/**
 * The real settings route (#455) against PGlite: `handle` is swapped for one with a
 * fake session and the test database — everything else (checks, parsing, services,
 * error contract) is the production code.
 */
const state = vi.hoisted(() => ({ db: null as unknown, userId: null as string | null }));

vi.mock("@/server/api/handle", async () => {
  const { createHandler } = await import("@/server/api/handler");
  const { services } = await import("@/server/services");
  const { errorResponse } = await import("@/server/auth/requireUser");
  return {
    handle: createHandler({
      requireUser: async () =>
        state.userId
          ? { ok: true, userId: state.userId, source: "ui" }
          : { ok: false, response: errorResponse(401, "unauthorized", "Sign in to continue.") },
      services: (ctx) => services({ db: state.db as Database, ...ctx }),
    }),
  };
});

const { GET, PATCH } = await import("@/app/api/v1/settings/route");

let close: () => Promise<void>;
const URL = "http://localhost/api/v1/settings";
const noParams = { params: Promise.resolve({}) };

function patch(body: string, headers: Record<string, string> = {}) {
  return PATCH(
    new Request(URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    }),
    noParams,
  );
}

beforeAll(async () => {
  const test = await createTestDb();
  state.db = test.db;
  close = test.close;
});
afterAll(() => close());
beforeEach(async () => {
  state.userId = await createTestUser(state.db as Database);
});

describe("/api/v1/settings (#455)", () => {
  it("answers 401 without a session", async () => {
    state.userId = null;
    const response = await GET(new Request(URL), noParams);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "Sign in to continue." },
    });
  });

  it("returns the defaults, then the saved settings", async () => {
    expect(await (await GET(new Request(URL), noParams)).json()).toEqual({
      data: { id: "app", statsSince: null },
    });
    const saved = await patch(JSON.stringify({ timeZone: "Europe/Berlin" }));
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({
      data: { id: "app", statsSince: null, timeZone: "Europe/Berlin" },
    });
    expect(await (await GET(new Request(URL), noParams)).json()).toEqual({
      data: { id: "app", statsSince: null, timeZone: "Europe/Berlin" },
    });
  });

  it("refuses fields the server owns with the issue path", async () => {
    const response = await patch(JSON.stringify({ source: "claude" }));
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("validation");
    expect(error.details.issues).toHaveLength(1);
  });

  it("passes the service's own validation through (first save needs the time zone)", async () => {
    const response = await patch(JSON.stringify({ statsSince: null }));
    expect(response.status).toBe(422);
    expect((await response.json()).error.details.issues).toEqual([
      { path: "timeZone", message: "The first save needs the time zone" },
    ]);
  });

  it("answers 415, 400 and 403 from the shared checks", async () => {
    expect((await patch("{}", { "Content-Type": "text/plain" })).status).toBe(415);
    expect((await patch("{nope")).status).toBe(400);
    const crossSite = await patch("{}", {
      cookie: "s=1",
      host: "localhost",
      origin: "https://evil.example",
    });
    expect(crossSite.status).toBe(403);
  });
});
