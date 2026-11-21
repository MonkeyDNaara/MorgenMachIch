import { describe, expect, it } from "vitest";
import { parseLearningEnv } from "@/server/env/parseLearningEnv";

const VALID = {
  LEARNING_API_URL: "https://example.ngrok-free.app/webhook/learning/",
  LEARNING_API_KEY: "k".repeat(40),
  LEARNING_OWNER_ID: "0b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b",
};

describe("parseLearningEnv (#462)", () => {
  it("is null (feature off) when nothing is set", () => {
    expect(parseLearningEnv({})).toBeNull();
    expect(parseLearningEnv({ LEARNING_API_URL: " ", LEARNING_API_KEY: "" })).toBeNull();
  });

  it("accepts a full configuration and drops the trailing slash", () => {
    expect(parseLearningEnv(VALID)).toEqual({
      ...VALID,
      LEARNING_API_URL: "https://example.ngrok-free.app/webhook/learning",
    });
  });

  it("names what is missing when only some variables are set", () => {
    expect(() => parseLearningEnv({ LEARNING_API_URL: VALID.LEARNING_API_URL })).toThrow(
      /LEARNING_API_KEY: missing.*LEARNING_OWNER_ID: missing/,
    );
  });

  it("rejects bad values without echoing them", () => {
    const run = () =>
      parseLearningEnv({
        LEARNING_API_URL: "http://secret-host",
        LEARNING_API_KEY: "tiny-secret",
        LEARNING_OWNER_ID: "niko",
      });
    expect(run).toThrow(/https:\/\/ URL.*at least 32 characters.*uuid/);
    expect(run).not.toThrow(/secret-host|tiny-secret/);
  });
});
