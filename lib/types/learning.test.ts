import { describe, expect, it } from "vitest";
import {
  LearningAnswerBodySchema,
  LearningDeepenSchema,
  LearningIdBodySchema,
  LearningQuizResultSchema,
  LearningQuizSchema,
  LearningTopicSchema,
} from "@/lib/types/learning";

/** Real n8n answers from 2026-11-21, texts shortened. */
const TODAY = {
  id: 3,
  topic: "Klasse vs. Objekt vs. Interface",
  explanation: "# Klasse, Objekt und Interface\n\n**Klasse (Class):** Eine Klasse ist …",
  deep_explanation: null,
};
const QUIZ = {
  id: 3,
  questions: [
    {
      question:
        "Du möchtest in deiner Anwendung die Zahlungsarten … anbieten. Was ist dafür am besten geeignet?",
      options: [
        "Eine Klasse `Zahlung` …",
        "Ein Objekt `Kreditkarte` …",
        "Ein Interface `Bezahlbar` …",
        "Drei Objekte …",
      ],
    },
  ],
};
const RESULT = {
  id: 3,
  topic: "Klasse vs. Objekt vs. Interface",
  passed: false,
  score: 0,
  total: 3,
  results: [
    {
      question: "Du möchtest … Was ist dafür am besten geeignet?",
      your_answer: "Eine Klasse `Zahlung` …",
      correct_answer: "Ein Interface `Bezahlbar` …",
      correct: false,
      why: "Ein Interface ist ein Vertrag …",
    },
  ],
};

describe("learning schemas (#462)", () => {
  it("accept the real n8n answers", () => {
    expect(LearningTopicSchema.parse(TODAY)).toEqual(TODAY);
    expect(LearningQuizSchema.parse(QUIZ)).toEqual(QUIZ);
    expect(LearningQuizResultSchema.parse(RESULT)).toEqual(RESULT);
  });

  it("treat a missing or empty deep explanation as null and drop unknown fields", () => {
    const next = { id: TODAY.id, topic: TODAY.topic, explanation: TODAY.explanation };
    expect(LearningTopicSchema.parse(next).deep_explanation).toBeNull();
    expect(
      LearningTopicSchema.parse({ ...TODAY, deep_explanation: "", status: "learning" }),
    ).toEqual(TODAY);
    expect(LearningDeepenSchema.parse({ ...TODAY, deep_explanation: "Deeper" })).toEqual({
      id: 3,
      deep_explanation: "Deeper",
    });
  });

  it("never let a quiz with solutions through to the client", () => {
    const withSolutions = {
      ...QUIZ,
      questions: [{ ...QUIZ.questions[0], correct_index: 2, why: "…" }],
    };
    expect(LearningQuizSchema.parse(withSolutions).questions[0]).not.toHaveProperty(
      "correct_index",
    );
  });

  it("keep request bodies strict", () => {
    expect(LearningIdBodySchema.safeParse({ id: 3 }).success).toBe(true);
    expect(LearningIdBodySchema.safeParse({ id: "3" }).success).toBe(false);
    expect(LearningIdBodySchema.safeParse({ id: 3, status: "understood" }).success).toBe(false);
    expect(LearningAnswerBodySchema.safeParse({ id: 3, answers: [0, 1, 2] }).success).toBe(true);
    expect(LearningAnswerBodySchema.safeParse({ id: 3, answers: [0.5] }).success).toBe(false);
  });
});
