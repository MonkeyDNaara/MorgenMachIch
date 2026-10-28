import { describe, expect, it } from "vitest";
import { authErrorCode, authErrorMessage } from "./authErrors";

describe("authErrorMessage (#445)", () => {
  it("maps the client's codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials", status: 401 })).toBe(
      "Wrong email or password.",
    );
    expect(authErrorMessage({ code: "email_not_confirmed", status: 403 })).toBe(
      "Your email isn't confirmed yet.",
    );
  });

  it("keeps our rate-limit message with the wait time", () => {
    expect(
      authErrorMessage({ status: 429, message: "Too many attempts. Try again in 15 min." }),
    ).toBe("Too many attempts. Try again in 15 min.");
    expect(authErrorMessage({ code: "over_request_rate_limit" })).toBe(
      "Too many attempts. Try again later.",
    );
  });

  it("translates the OTP messages", () => {
    expect(authErrorMessage({ status: 400, message: "Invalid OTP" })).toBe(
      "That code isn't right.",
    );
    expect(authErrorMessage({ status: 400, message: "OTP expired" })).toBe(
      "That code has expired. Send a new one.",
    );
  });

  it("explains network problems and falls back to a generic sentence", () => {
    expect(authErrorMessage(new TypeError("Failed to fetch"))).toMatch(/Can't reach the server/);
    expect(authErrorMessage({ status: 500, message: "boom" })).toBe(
      "Something went wrong. Try again.",
    );
    expect(authErrorMessage(null)).toBe("Something went wrong. Try again.");
  });
});

describe("authErrorCode", () => {
  it("reads the code when there is one", () => {
    expect(authErrorCode({ code: "email_not_confirmed" })).toBe("email_not_confirmed");
    expect(authErrorCode(new Error("x"))).toBeNull();
  });
});
