import { describe, expect, it } from "vitest";
import { learnMetaOf } from "@/features/learning/lib/learnMeta";
import type { LearningTopic } from "@/lib/types/learning";

const topic = (patch: Partial<LearningTopic> = {}): LearningTopic => ({
  id: 7,
  topic: "Closures",
  explanation: "x",
  deep_explanation: null,
  status: "learning",
  understood_at: null,
  times_taught: 1,
  ...patch,
});
const UNDERSTOOD = { status: "understood", understood_at: "2026-11-12T09:00:00.000Z" } as const;

describe("learnMetaOf", () => {
  it("New, still learning", () => {
    expect(learnMetaOf(topic(), "today")).toEqual({
      label: "learning · taught 1×",
      understood: false,
    });
  });

  it("New, understood: no date", () => {
    expect(learnMetaOf(topic({ ...UNDERSTOOD, times_taught: 2 }), "today")).toEqual({
      label: "understood · taught 2×",
      understood: true,
    });
  });

  it("Review shows the day it was understood", () => {
    expect(learnMetaOf(topic({ ...UNDERSTOOD, times_taught: 3 }), "review")).toEqual({
      label: "understood 12 Nov · taught 3×",
      understood: true,
    });
  });

  it("Review falls back to learning after a failed quiz, understood_at stays unused", () => {
    expect(
      learnMetaOf(topic({ ...UNDERSTOOD, status: "learning", times_taught: 3 }), "review"),
    ).toEqual({
      label: "learning · taught 3×",
      understood: false,
    });
  });

  it("Review without understood_at doesn't invent a date", () => {
    expect(learnMetaOf(topic({ status: "understood" }), "review").label).toBe(
      "understood · taught 1×",
    );
  });
});
