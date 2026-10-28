import { afterEach, describe, expect, it, vi } from "vitest";
import { requireUserFrom, userIdFromSession } from "@/server/auth/requireUser";

const ID = "0b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b";

afterEach(() => vi.restoreAllMocks());

describe("userIdFromSession (#309)", () => {
  it("reads the user id of a Better Auth session", () => {
    expect(userIdFromSession({ data: { user: { id: ID }, session: {} } })).toBe(ID);
  });

  it("is null without a session or with an odd id", () => {
    expect(userIdFromSession({ data: null })).toBeNull();
    expect(userIdFromSession({ data: { user: { id: "42" } } })).toBeNull();
    expect(userIdFromSession(null)).toBeNull();
    expect(userIdFromSession({ error: { message: "x" } })).toBeNull();
  });
});

describe("requireUserFrom", () => {
  it("passes the user id through", async () => {
    expect(await requireUserFrom(async () => ({ data: { user: { id: ID } } }))).toEqual({
      ok: true,
      userId: ID,
    });
  });

  it("answers 401 in the API error format without a session", async () => {
    const result = await requireUserFrom(async () => ({ data: null }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("Cache-Control")).toBe("no-store");
    expect(await result.response.json()).toEqual({
      error: { code: "unauthorized", message: "Sign in to continue." },
    });
  });

  it("answers 503 without details when the session check fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await requireUserFrom(async () => {
      throw new Error("connect ECONNREFUSED secret-host");
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(503);
    expect(JSON.stringify(await result.response.json())).not.toContain("secret-host");
  });
});
