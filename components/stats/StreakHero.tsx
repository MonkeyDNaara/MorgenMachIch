import type { StreakSummary } from "@/lib/utils/stats";
import { addLocalDays, startOfLocalWeek } from "@/lib/utils/stats";
import { toLocalDateKey } from "@/lib/utils/planDateOptions";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

type StreakHeroProps = {
  streak: StreakSummary;
  byDay: Map<string, number>;
  todayCount: number;
  now: Date;
};

/**
 * The big current-streak card on /stats (#215): the number, this week's
 * days as dots (filled = something completed; today dashed until it is),
 * and a hint for what to do next — keep an at-risk streak alive, or start
 * one.
 */
export default function StreakHero({ streak, byDay, todayCount, now }: StreakHeroProps) {
  const monday = startOfLocalWeek(now);
  const todayKey = toLocalDateKey(now);
  const week = WEEKDAY_LETTERS.map((letter, index) => {
    const key = toLocalDateKey(addLocalDays(monday, index));
    return {
      key,
      letter,
      done: key <= todayKey && (byDay.get(key) ?? 0) > 0,
      isToday: key === todayKey,
    };
  });

  const hint = streak.atRisk
    ? { text: "Complete a task today to keep it", accent: true }
    : todayCount > 0
      ? { text: `${todayCount} done today`, accent: false }
      : streak.current === 0
        ? { text: "Complete a task to start a streak", accent: false }
        : null;

  return (
    <section className="flex flex-col justify-between gap-4 rounded-box bg-base-200 p-4 shadow-lg shadow-black/20">
      <h2 className="text-xs text-base-content/60">Current streak</h2>
      <p className="text-6xl leading-none font-semibold tracking-tight text-primary tabular-nums">
        {streak.current}
        <span className="ml-2 text-base font-normal tracking-normal text-base-content/50">
          {streak.current === 1 ? "day" : "days"}
        </span>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ol className="flex gap-2" aria-label="This week">
          {week.map((day) => (
            <li
              key={day.key}
              className="flex flex-col items-center gap-1 font-mono text-[10px] text-base-content/40"
            >
              <span
                aria-hidden
                className={`size-5 rounded-full border-2 ${
                  day.done
                    ? "border-primary bg-primary shadow-[0_0_0_3px_rgba(77,209,224,0.15)]"
                    : day.isToday
                      ? "border-dashed border-primary"
                      : "border-base-300"
                }`}
              />
              <span aria-hidden>{day.letter}</span>
              <span className="sr-only">
                {day.key}: {day.done ? "completed something" : "nothing completed"}
              </span>
            </li>
          ))}
        </ol>
        {hint &&
          (hint.accent ? (
            <p className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {hint.text}
            </p>
          ) : (
            <p className="text-xs text-base-content/40">{hint.text}</p>
          ))}
      </div>
    </section>
  );
}
