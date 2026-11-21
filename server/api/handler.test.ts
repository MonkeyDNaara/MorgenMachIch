import { afterEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/server/api/json";
import { canAccess, createHandler, type HandlerDeps } from "@/server/api/handler";
import { errorResponse } from "@/server/auth/requireUser";
import type { Services } from "@/server/services";
import { NotFoundError } from "@/server/services/errors";

const USER = "0b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b";
const fakeApi = { marker: "api" } as unknown as Services;

afterEach(() => vi.restoreAllMocks());

function setup(auth: Awaited<ReturnType<HandlerDeps["requireUser"]>>) {
  const deps = {
    requireUser: vi.fn(async () => auth),
    services: vi.fn(() => fakeApi),
  };
  return { deps, handle: createHandler(deps) };
}

const signedIn = { ok: true as const, userId: USER, source: "ui" as const };
const noParams = { params: Promise.resolve({}) };

describe("canAccess (#455)", () => {
  it("lets sessions do everything", () => {
    for (const access of ["read", "write", "delete"] as const) {
      expect(canAccess("ui", access)).toBe(true);
    }
  });

  it("refuses other sources until API keys bring their scopes (#315)", () => {
    expect(canAccess("n8n", "read")).toBe(false);
    expect(canAccess("claude", "delete")).toBe(false);
  });
});

describe("createHandler (#455)", () => {
  it("builds the services for the session's user and passes the params", async () => {
    const { deps, handle } = setup(signedIn);
    const route = handle<{ id: string }>({ access: "read" }, async ({ api, params }) =>
      ok({ same: api === fakeApi, id: params.id }),
    );
    const response = await route(new Request("http://localhost/api/v1/x/7"), {
      params: Promise.resolve({ id: "7" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ data: { same: true, id: "7" } });
    expect(deps.services).toHaveBeenCalledWith({ userId: USER, source: "ui" });
  });

  it("returns the session check's 401 and never builds services", async () => {
    const { deps, handle } = setup({
      ok: false,
      response: errorResponse(401, "unauthorized", "Sign in to continue."),
    });
    const fn = vi.fn();
    const response = await handle({ access: "read" }, fn)(
      new Request("http://localhost/api/v1/x"),
      noParams,
    );
    expect(response.status).toBe(401);
    expect(fn).not.toHaveBeenCalled();
    expect(deps.services).not.toHaveBeenCalled();
  });

  it("refuses unsafe writes before the session is read", async () => {
    const { deps, handle } = setup(signedIn);
    const route = handle({ access: "write" }, async () => ok(null));
    const crossSite = await route(
      new Request("http://localhost/api/v1/x", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "s=1",
          host: "localhost",
          origin: "https://evil.example",
        },
        body: "{}",
      }),
      noParams,
    );
    expect(crossSite.status).toBe(403);
    expect((await crossSite.json()).error.code).toBe("forbidden_origin");
    const form = await route(
      new Request("http://localhost/api/v1/x", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "a=1",
      }),
      noParams,
    );
    expect(form.status).toBe(415);
    expect(deps.requireUser).not.toHaveBeenCalled();
  });

  it("turns thrown errors into the error contract", async () => {
    const { handle } = setup(signedIn);
    const response = await handle({ access: "read" }, async () => {
      throw new NotFoundError("Task", "t9");
    })(new Request("http://localhost/api/v1/x"), noParams);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: "Task t9 not found" },
    });
  });

  it("marks a route's own responses no-store too", async () => {
    const { handle } = setup(signedIn);
    const response = await handle({ access: "read" }, async () => Response.json({ x: 1 }))(
      new Request("http://localhost/api/v1/x"),
      noParams,
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
