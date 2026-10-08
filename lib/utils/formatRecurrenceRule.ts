import type { RecurrenceRule } from "@/lib/types";
import { APP_LOCALE } from "@/lib/constants/locale";

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 1/2/3/4 -> "first".."fourth", -1 -> "last" (nthWeekday's supported values). */
const NTH_LABELS: Record<number, string> = { 1: "first", 2: "second", 3: "third", 4: "fourth", [-1]: "last" };

function ordinal(n: number): string {
  const category = new Intl.PluralRules(APP_LOCALE, { type: "ordinal" }).select(n);
  const suffix = ({ one: "st", two: "nd", few: "rd", other: "th" } as Partial<Record<Intl.LDMLPluralRule, string>>)[
    category
  ] ?? "th";
  return `${n}${suffix}`;
}

/** Sorted Mon-first (matching the rest of the app's week convention),
 * not by raw 0=Sun..6=Sat value. */
function formatDaysOfWeek(daysOfWeek: number[]): string {
  const sorted = [...daysOfWeek].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  return sorted.map((day) => WEEKDAY_ABBR[day]).join(", ");
}

/**
 * Plain-English summary of a RecurrenceRule, for the Series section on
 * /tasks (#62) — e.g. "Every day", "Every 2 weeks on Mon, Wed", "Every
 * month on the 15th", "Every month on the last Friday". Appends a
 * "· until {date}" suffix when the rule has an end date, same idiom as
 * TaskCard's "· overdue"/"· skipped" suffixes.
 */
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  let base: string;

  if (rule.frequency === "daily") {
    base = rule.interval === 1 ? "Every day" : `Every ${rule.interval} days`;
  } else if (rule.frequency === "weekly") {
    const days = formatDaysOfWeek(rule.daysOfWeek ?? []);
    base = rule.interval === 1 ? `Every week on ${days}` : `Every ${rule.interval} weeks on ${days}`;
  } else {
    const every = rule.interval === 1 ? "Every month" : `Every ${rule.interval} months`;
    if (rule.monthlyMode === "dayOfMonth" && rule.dayOfMonth !== undefined) {
      base = `${every} on the ${ordinal(rule.dayOfMonth)}`;
    } else if (rule.monthlyMode === "nthWeekday" && rule.nthWeekday) {
      const nthLabel = NTH_LABELS[rule.nthWeekday.n] ?? `${rule.nthWeekday.n}th`;
      base = `${every} on the ${nthLabel} ${WEEKDAY_ABBR[rule.nthWeekday.weekday]}`;
    } else {
      base = every;
    }
  }

  if (rule.endDate) {
    const endLabel = new Date(rule.endDate).toLocaleDateString(APP_LOCALE, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${base} · until ${endLabel}`;
  }

  return base;
}
