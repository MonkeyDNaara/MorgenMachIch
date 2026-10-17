import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/server/db/types";
import { buildHealthBody, checkDatabase, healthHttpStatus, shortCommit } from "@/server/health";
import { createTestDb } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe("checkDatabase", () => {
  it("reports ok with the measured latency", async () => {
    let tick = 100;
    const result = await checkDatabase(
      () => db,
      5_000,
      () => (tick += 12),
    );
    expect(result).toEqual({ status: "ok", latencyMs: 12 });
  });

  it("reports unavailable when the database cannot be created (e.g. missing DATABASE_URL)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await checkDatabase(() => {
      throw new Error("Invalid server environment — DATABASE_URL: missing");
    });
    expect(result).toEqual({ status: "unavailable" });
    expect(log).toHaveBeenCalledWith(
      "[health] database check failed:",
      expect.stringContaining("DATABASE_URL: missing"),
    );
    log.mockRestore();
  });

  it("reports unavailable when the query fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { execute: () => Promise.reject(new Error("connection refused")) };
    expect(await checkDatabase(() => broken as unknown as Database)).toEqual({
      status: "unavailable",
    });
    log.mockRestore();
  });

  it("reports unavailable when the query takes longer than the timeout", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const hanging = { execute: () => new Promise(() => {}) };
    expect(await checkDatabase(() => hanging as unknown as Database, 20)).toEqual({
      status: "unavailable",
    });
    expect(log).toHaveBeenCalledWith("[health] database check failed:", "timed out after 20 ms");
    log.mockRestore();
  });
});

describe("shortCommit", () => {
  it("shortens a git SHA to 7 characters", () => {
    expect(shortCommit("884b8a76ca73ff91147e4e27c13475200e2eb8ea")).toBe("884b8a7");
    expect(shortCommit(" 884B8A7 ")).toBe("884b8a7");
  });

  it("returns null without a valid SHA", () => {
    expect(shortCommit(undefined)).toBeNull();
    expect(shortCommit("")).toBeNull();
    expect(shortCommit("main")).toBeNull();
    expect(shortCommit("abc12")).toBeNull();
  });
});

describe("buildHealthBody / healthHttpStatus", () => {
  it("liveness: ok without a db field", () => {
    const body = buildHealthBody({ version: "0.1.0", commit: "884b8a7" });
    expect(body).toEqual({ status: "ok", version: "0.1.0", commit: "884b8a7" });
    expect("db" in body).toBe(false);
    expect(healthHttpStatus(body)).toBe(200);
  });

  it("deep check ok: 200 with the db result", () => {
    const body = buildHealthBody({
      version: "0.1.0",
      commit: null,
      db: { status: "ok", latencyMs: 24 },
    });
    expect(body).toEqual({
      status: "ok",
      version: "0.1.0",
      commit: null,
      db: { status: "ok", latencyMs: 24 },
    });
    expect(healthHttpStatus(body)).toBe(200);
  });

  it("deep check failed: 503, no error details", () => {
    const body = buildHealthBody({ version: "0.1.0", commit: null, db: { status: "unavailable" } });
    expect(body).toEqual({
      status: "unavailable",
      version: "0.1.0",
      commit: null,
      db: { status: "unavailable" },
    });
    expect(healthHttpStatus(body)).toBe(503);
  });
});
