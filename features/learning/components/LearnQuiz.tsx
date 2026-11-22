"use client";

import { useId } from "react";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";
import type { LearningQuiz } from "@/lib/types/learning";

type QuestionProps = {
  index: number;
  question: string;
  options: string[];
  selected: number | null;
  locked: boolean;
  onSelect: (option: number) => void;
};

function Question({ index, question, options, selected, locked, onSelect }: QuestionProps) {
  const labelId = useId();
  const { groupProps, itemProps } = useRadioGroupKeys({
    count: options.length,
    selectedIndex: selected ?? -1,
    onSelect: (option) => {
      if (!locked) onSelect(option);
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <p id={labelId} className="text-body font-medium">
        <span className="mr-2 font-mono text-meta text-subtle">{index + 1}</span>
        {question}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={locked || undefined}
        className="flex flex-col gap-2"
        {...groupProps}
      >
        {options.map((option, optionIndex) => {
          const checked = selected === optionIndex;
          return (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={locked}
              onClick={() => onSelect(optionIndex)}
              className={`rounded-field border px-3.5 py-2.5 text-left text-sm transition-colors focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default ${
                checked
                  ? "border-accent bg-accent/10 text-body"
                  : "border-line bg-sunken text-muted enabled:hover:bg-line-strong"
              }`}
              {...itemProps(optionIndex)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type LearnQuizProps = {
  quiz: LearningQuiz;
  /** One chosen option per question, null while unanswered. */
  answers: (number | null)[];
  /** The answers are on their way: the options are locked. */
  locked: boolean;
  /** The last submit failed; the choices are kept. */
  failed: boolean;
  onSelect: (question: number, option: number) => void;
};

/**
 * Step 2 (#467): three questions, one radiogroup each. The page owns the choices (and the
 * sticky bar with Submit), so a failed submit loses nothing.
 */
export default function LearnQuiz({ quiz, answers, locked, failed, onSelect }: LearnQuizProps) {
  return (
    <div className="flex flex-col gap-6">
      {quiz.questions.map((question, index) => (
        <Question
          key={index}
          index={index}
          question={question.question}
          options={question.options}
          selected={answers[index] ?? null}
          locked={locked}
          onSelect={(option) => onSelect(index, option)}
        />
      ))}
      {failed && (
        <p
          role="alert"
          className="rounded-field border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
        >
          Your answers could not be submitted. They are kept; try again.
        </p>
      )}
    </div>
  );
}
