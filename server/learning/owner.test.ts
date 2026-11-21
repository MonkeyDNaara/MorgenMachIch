import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/errors";
import { requireLearningOwner } from "@/server/learning/owner";

const OWNER = "0b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b";
const ENV = {
  LEARNING_API_URL: "https://n8n.example/webhook/learning",
  LEARNING_API_KEY: "k".repeat(40),
  LEARNING_OWNER_ID: OWNER,
};

describe("requireLearningOwner (#462)", () => {
  it("lets only the owner through", () => {
    expect(requireLearningOwner(ENV, OWNER)).toBe(ENV);
  });

  it("answers 404 for anyone else and while the feature is off", () => {
    for (const [env, user] of [
      [ENV, "1b7d4c2e-5f1a-4c3b-9d8e-7a6f5e4d3c2b"],
      [null, OWNER],
    ] as const) {
      try {
        requireLearningOwner(env, user);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    }
  });
});
