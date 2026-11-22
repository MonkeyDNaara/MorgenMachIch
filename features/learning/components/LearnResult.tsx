import { CircleCheck, CircleX } from "lucide-react";
import Markdown from "@/components/ui/Markdown";
import type { LearningQuizResult } from "@/lib/types/learning";

type LearnResultProps = { result: LearningQuizResult };

/**
 * Step 3 (#467): score, pill, one segment per question, then each answer with its "why".
 * Right answers take one line, wrong ones show yours next to the correct one. The actions
 * (next topic / read again / new quiz) are in the page's sticky bar.
 */
export default function LearnResult({ result }: LearnResultProps) {
  const { passed, score, total } = result;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {score}/{total}
          <span className="sr-only"> correct</span>
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            passed ? "bg-success/15 text-success" : "bg-error/10 text-error"
          }`}
        >
          {passed ? <CircleCheck size={14} aria-hidden /> : <CircleX size={14} aria-hidden />}
          {passed ? "Passed" : "Not passed"}
        </span>
      </div>
      <div aria-hidden className="flex gap-1.5">
        {result.results.map((item, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${item.correct ? "bg-success" : "bg-error"}`}
          />
        ))}
      </div>
      <ol className="flex flex-col gap-5">
        {result.results.map((item, index) => (
          <li key={index} className="flex flex-col gap-2">
            <p className="text-body font-medium">
              <span className="mr-2 font-mono text-meta text-subtle">{index + 1}</span>
              {item.question}
            </p>
            {item.correct ? (
              <p className="flex items-start gap-1.5 text-sm text-success">
                <CircleCheck size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span>
                  <span className="sr-only">Correct: </span>
                  {item.correct_answer}
                </span>
              </p>
            ) : (
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex items-start gap-1.5 text-error">
                  <CircleX size={14} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <dt className="inline text-muted">Your answer: </dt>
                    <dd className="inline">{item.your_answer}</dd>
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-success">
                  <CircleCheck size={14} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <dt className="inline text-muted">Correct: </dt>
                    <dd className="inline">{item.correct_answer}</dd>
                  </span>
                </div>
              </dl>
            )}
            {item.why && <Markdown text={item.why} className="text-sm text-muted" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
