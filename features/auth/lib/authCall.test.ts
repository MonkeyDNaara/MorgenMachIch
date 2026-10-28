import { describe, expect, it } from "vitest";
import { authCall, hasSession } from "./authCall";

describe("authCall (#445)", () => {
  it("passes results through", async () => {
    await expect(authCall(Promise.resolve({ data: { ok: true }, error: null }))).resolves.toEqual({
      data: { ok: true },
      error: null,
    });
  });

  it("throws a returned error", async () => {
    const error = { code: "invalid_credentials", status: 401 };
    await expect(authCall(Promise.resolve({ data: null, error }))).rejects.toBe(error);
  });

  it("lets thrown errors through", async () => {
    await expect(authCall(Promise.reject(new Error("x")))).rejects.toThrow("x");
  });
});

describe("hasSession", () => {
  it("is true only with a user", () => {
    expect(hasSession({ data: { user: { id: "1" }, session: {} } })).toBe(true);
    expect(hasSession({ data: null })).toBe(false);
    expect(hasSession(null)).toBe(false);
  });
});
