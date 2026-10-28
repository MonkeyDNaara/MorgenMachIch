import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordProblem, passwordStrength } from "./password";

describe("passwordProblem (#445)", () => {
  it("asks for the minimum length", () => {
    expect(passwordProblem("short")).toBe(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });
});

describe("passwordStrength", () => {
  it("rates by length first, then variety", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("Ab1!xyz")).toBe(1); // varied but short
    expect(passwordStrength("aaaaaaaaaaaa")).toBe(2);
    expect(passwordStrength("aaaaaaaaaaaaaaaa")).toBe(3);
    expect(passwordStrength("Aaaaaaaaaaa1")).toBe(3);
    expect(passwordStrength("Correct-Horse-42")).toBe(4);
  });
});
