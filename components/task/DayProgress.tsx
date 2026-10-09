import type { DayProgress as Progress } from "@/lib/utils/dayProgress";

/** Above this many tasks the segments would get too thin, so one continuous bar is drawn. */
const MAX_SEGMENTS = 12;

/**
 * Today's progress in the /today header (#233): a sunken track with one
 * accent segment per task (a single bar for long days) and a short line
 * of copy. Renders a plain note when nothing is due.
 */
export default function DayProgress({ done, total }: Progress) {
  if (total === 0) return <p>Nothing due today.</p>;

  const remaining = total - done;
  const caption =
    remaining === 0
      ? "All done — Morgen can wait."
      : `${done} of ${total} done — ${remaining} to go before Morgen.`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div
        role="progressbar"
        aria-label="Tasks done today"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} done`}
        className="flex gap-1 rounded-lg bg-sunken p-1 shadow-sunken"
      >
        {total <= MAX_SEGMENTS ? (
          Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 w-6 rounded-full ${index < done ? "bg-accent" : "bg-base-300"}`}
            />
          ))
        ) : (
          <span className="h-1.5 w-48 overflow-hidden rounded-full bg-base-300">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </span>
        )}
      </div>
      <span>{caption}</span>
    </div>
  );
}
