import { Check } from "lucide-react";

const STEPS = ["Explanation", "Quiz", "Result"] as const;

/** Explanation → Quiz → Result (#467). `step` is the index of the current one. */
export default function LearnStepper({ step }: { step: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {STEPS.map((label, index) => {
        const done = index < step;
        const current = index === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={`flex items-center gap-2 border-b-2 pb-1.5 font-mono text-eyebrow uppercase ${
              current
                ? "border-accent text-accent"
                : done
                  ? "border-transparent text-muted"
                  : "border-transparent text-faint"
            }`}
          >
            {done ? <Check size={12} aria-hidden /> : <span aria-hidden>{index + 1}</span>}
            {label}
            {done && <span className="sr-only"> (done)</span>}
          </li>
        );
      })}
    </ol>
  );
}
