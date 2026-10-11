import type { RecurrenceRule } from "@/lib/types";

/**
 * Finds a recurrence phrase ("every mon and thu", "jeden ersten Montag",
 * "alle 2 Wochen dienstags", "monthly on the 15th") in quick-add text
 * (#274). Pure grammar only: it returns the phrase's range and the parts
 * of the rule it names. Start date, time of day and end date come from
 * the normal date tokens around it — `parseQuickAdd` combines them.
 *
 * English and German are separate grammars (no mixing within one phrase),
 * which keeps two-letter German weekdays ("Do", "So") from matching inside
 * English text ("every mon and do the dishes").
 *
 * A phrase needs a recognised unit, weekday or day of month after
 * "every"/"jeden" — "every time I…" or "alle Aufgaben" stay text.
 */

/** A rule without `endDate`; weekly days / monthly mode may still be open
 * ("weekly", "monthly") and get filled from the start date. */
export type RecurrencePattern = Omit<RecurrenceRule, "endDate">;

export type RecurrencePhrase = {
  start: number;
  /** End exclusive. */
  end: number;
  pattern: RecurrencePattern;
};

type Lang = "en" | "de";
type Frequency = RecurrenceRule["frequency"];
type Word = { key: string; start: number; end: number };

// --- vocabulary -------------------------------------------------------------

const WEEKDAYS: Record<Lang, Record<string, number>> = {
  en: {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  },
  de: {
    sonntag: 0,
    so: 0,
    montag: 1,
    mo: 1,
    dienstag: 2,
    di: 2,
    mittwoch: 3,
    mi: 3,
    donnerstag: 4,
    do: 4,
    freitag: 5,
    fr: 5,
    samstag: 6,
    sonnabend: 6,
    sa: 6,
  },
};

/** "mondays", "montags" — enough on their own to mean "every". */
const PLURAL_WEEKDAYS: Record<Lang, Record<string, number>> = {
  en: {
    sundays: 0,
    mondays: 1,
    tuesdays: 2,
    wednesdays: 3,
    thursdays: 4,
    fridays: 5,
    saturdays: 6,
  },
  de: {
    sonntags: 0,
    montags: 1,
    dienstags: 2,
    mittwochs: 3,
    donnerstags: 4,
    freitags: 5,
    samstags: 6,
    sonnabends: 6,
  },
};

const CONNECTORS: Record<Lang, Set<string>> = {
  en: new Set([",", "and", "&", "+", "/"]),
  de: new Set([",", "und", "&", "+", "/"]),
};

const NUMBER_WORDS: Record<Lang, Record<string, number>> = {
  en: {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    other: 2,
  },
  de: {
    ein: 1,
    eine: 1,
    einen: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    fünf: 5,
    fuenf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
    zehn: 10,
    elf: 11,
    zwölf: 12,
    zwoelf: 12,
  },
};

/** "first" … "fourth", "last" — for "every first monday" and, with a unit,
 * as an interval ("every second week", "jede zweite Woche"). */
const ORDINAL_WORDS: Record<Lang, Record<string, number>> = {
  en: { first: 1, second: 2, third: 3, fourth: 4, last: -1 },
  de: {
    erste: 1,
    ersten: 1,
    erster: 1,
    erstes: 1,
    zweite: 2,
    zweiten: 2,
    zweiter: 2,
    zweites: 2,
    dritte: 3,
    dritten: 3,
    dritter: 3,
    drittes: 3,
    vierte: 4,
    vierten: 4,
    vierter: 4,
    viertes: 4,
    letzte: -1,
    letzten: -1,
    letzter: -1,
    letztes: -1,
  },
};

const UNITS: Record<Lang, Record<string, Frequency>> = {
  en: {
    day: "daily",
    days: "daily",
    week: "weekly",
    weeks: "weekly",
    month: "monthly",
    months: "monthly",
  },
  de: {
    tag: "daily",
    tage: "daily",
    tagen: "daily",
    woche: "weekly",
    wochen: "weekly",
    monat: "monthly",
    monate: "monthly",
    monaten: "monthly",
  },
};

const WORKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 0];
const DAY_SETS: Record<Lang, Record<string, number[]>> = {
  en: {
    weekday: WORKDAYS,
    weekdays: WORKDAYS,
    workday: WORKDAYS,
    workdays: WORKDAYS,
    weekend: WEEKEND,
    weekends: WEEKEND,
  },
  de: { werktag: WORKDAYS, wochentag: WORKDAYS, arbeitstag: WORKDAYS, wochenende: WEEKEND },
};

const EVERY: Record<Lang, Set<string>> = {
  en: new Set(["every", "each"]),
  de: new Set(["jeden", "jede", "jedes", "jedem"]),
};

/** Words that are a whole rule on their own ("daily", "werktags"). */
const ADVERBS: Record<Lang, Record<string, Frequency | number[]>> = {
  en: { daily: "daily", weekly: "weekly", monthly: "monthly", weekdays: WORKDAYS },
  de: {
    täglich: "daily",
    taeglich: "daily",
    wöchentlich: "weekly",
    woechentlich: "weekly",
    monatlich: "monthly",
    werktags: WORKDAYS,
    wochentags: WORKDAYS,
    arbeitstags: WORKDAYS,
  },
};

const ON: Record<Lang, Set<string>> = { en: new Set(["on"]), de: new Set(["am", "an", "jeweils"]) };

// --- words ------------------------------------------------------------------

// "15th", German "15." (not "15.11"), plain numbers, words (a trailing dot
// is dropped: "Mo."), and list punctuation.
const WORD = /\d{1,2}(?:st|nd|rd|th)\b|\d{1,2}\.(?!\d)|\d+|\p{L}+\.?|[,&+/]/giu;

function tokenize(text: string): Word[] {
  const words: Word[] = [];
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    let raw = match[0];
    if (/^\p{L}+\.$/u.test(raw)) raw = raw.slice(0, -1);
    words.push({ key: raw.toLowerCase(), start, end: start + raw.length });
  }
  return words;
}

/** Ordinal day of month: "15th" (en) or "15." (de), 1–31. */
function dayOfMonth(key: string | undefined, lang: Lang): number | null {
  if (!key) return null;
  const match = lang === "en" ? /^(\d{1,2})(?:st|nd|rd|th)$/.exec(key) : /^(\d{1,2})\.$/.exec(key);
  if (!match) return null;
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : null;
}

/** "2", "two", "other" → an interval count. */
function count(key: string | undefined, lang: Lang): number | null {
  if (!key) return null;
  if (/^\d{1,2}$/.test(key)) {
    const n = Number(key);
    return n >= 1 ? n : null;
  }
  return NUMBER_WORDS[lang][key] ?? null;
}

/** "first", "2nd", "ersten", "2." → 1–4 or -1 (last). */
function ordinal(key: string | undefined, lang: Lang): number | null {
  if (!key) return null;
  const word = ORDINAL_WORDS[lang][key];
  if (word !== undefined) return word;
  const day = dayOfMonth(key, lang);
  return day !== null && day <= 4 ? day : null;
}

// --- grammar ----------------------------------------------------------------

type Match = { pattern: RecurrencePattern; next: number };

class PhraseParser {
  private readonly words: Word[];
  private readonly text: string;
  private readonly lang: Lang;

  constructor(words: Word[], text: string, lang: Lang) {
    this.words = words;
    this.text = text;
    this.lang = lang;
  }

  /** Key of word `i` if it directly follows word `i - 1` (only spaces between). */
  key(i: number): string | undefined {
    const word = this.words[i];
    if (!word) return undefined;
    if (i > 0 && this.text.slice(this.words[i - 1].end, word.start).trim() !== "") return undefined;
    return word.key;
  }

  weekday(i: number, plural = false): number | undefined {
    const key = this.key(i);
    return key === undefined ? undefined : (plural ? PLURAL_WEEKDAYS : WEEKDAYS)[this.lang][key];
  }

  /** "mon, wed and fri" → days and the index after the list. */
  dayList(i: number, plural = false): { days: number[]; next: number } | null {
    const first = this.weekday(i, plural);
    if (first === undefined) return null;
    const days = [first];
    let next = i + 1;
    for (;;) {
      let j = next;
      let sawConnector = false;
      while (CONNECTORS[this.lang].has(this.key(j) ?? "")) {
        j++;
        sawConnector = true;
      }
      const day = sawConnector ? this.weekday(j, plural) : undefined;
      if (day === undefined) break;
      days.push(day);
      next = j + 1;
    }
    return { days: [...new Set(days)].sort((a, b) => a - b), next };
  }

  /** Optional "of the month" / "des Monats" / "im Monat" after a monthly day. */
  ofTheMonth(i: number): number {
    const sequences =
      this.lang === "en"
        ? [
            ["of", "the", "month"],
            ["of", "every", "month"],
            ["of", "each", "month"],
            ["a", "month"],
          ]
        : [
            ["des", "monats"],
            ["im", "monat"],
            ["jeden", "monats"],
            ["eines", "monats"],
          ];
    for (const sequence of sequences) {
      if (sequence.every((word, offset) => this.key(i + offset) === word))
        return i + sequence.length;
    }
    return i;
  }

  /** A monthly day: "15th", "15.", "first monday", "letzten Freitag". */
  monthlyDay(i: number): Match | null {
    const n = ordinal(this.key(i), this.lang);
    const weekday = this.weekday(i + 1);
    if (n !== null && weekday !== undefined) {
      return {
        pattern: {
          frequency: "monthly",
          interval: 1,
          monthlyMode: "nthWeekday",
          nthWeekday: { n, weekday },
        },
        next: this.ofTheMonth(i + 2),
      };
    }
    const day = dayOfMonth(this.key(i), this.lang);
    if (day !== null) {
      return {
        pattern: { frequency: "monthly", interval: 1, monthlyMode: "dayOfMonth", dayOfMonth: day },
        next: this.ofTheMonth(i + 1),
      };
    }
    return null;
  }

  /** Optional details after a frequency: "on tue and thu", "dienstags", "on the 1st". */
  tail(pattern: RecurrencePattern, i: number): Match {
    let j = i;
    const hasOn = ON[this.lang].has(this.key(j) ?? "");
    if (hasOn) j++;
    if (this.lang === "en" && hasOn && this.key(j) === "the") j++;

    if (pattern.frequency === "weekly") {
      const list = this.dayList(j) ?? this.dayList(j, true);
      if (list && (hasOn || this.weekday(j, true) !== undefined)) {
        return { pattern: { ...pattern, daysOfWeek: list.days }, next: list.next };
      }
    }
    if (pattern.frequency === "monthly") {
      const day = this.monthlyDay(j);
      if (day) return { pattern: { ...day.pattern, interval: pattern.interval }, next: day.next };
    }
    return { pattern, next: i };
  }

  /** Everything after "every" / "jeden". */
  afterEvery(i: number): Match | null {
    const key = this.key(i);
    if (key === undefined) return null;

    // "every 2 weeks", "every other day", "every second month", "jede zweite Woche"
    const n = count(key, this.lang) ?? ordinal(key, this.lang);
    const unit = UNITS[this.lang][this.key(i + 1) ?? ""];
    if (n !== null && n >= 1 && unit) return this.tail({ frequency: unit, interval: n }, i + 2);

    const single = UNITS[this.lang][key];
    if (single) return this.tail({ frequency: single, interval: 1 }, i + 1);

    const set = DAY_SETS[this.lang][key];
    if (set)
      return {
        pattern: { frequency: "weekly", interval: 1, daysOfWeek: [...set].sort() },
        next: i + 1,
      };

    const monthly = this.monthlyDay(i);
    if (monthly) return monthly;

    const list = this.dayList(i);
    if (list)
      return {
        pattern: { frequency: "weekly", interval: 1, daysOfWeek: list.days },
        next: list.next,
      };
    return null;
  }

  /** A phrase starting at word `i`, or null. */
  at(i: number): Match | null {
    const key = this.key(i) ?? this.words[i].key;
    if (EVERY[this.lang].has(key)) return this.afterEvery(i + 1);

    // German "alle 2 Wochen", "alle zwei Monate" (needs a count)
    if (this.lang === "de" && key === "alle") {
      const n = count(this.key(i + 1), "de");
      const unit = UNITS.de[this.key(i + 2) ?? ""];
      if (n !== null && unit) return this.tail({ frequency: unit, interval: n }, i + 3);
      return null;
    }

    const adverb = ADVERBS[this.lang][key];
    if (Array.isArray(adverb)) {
      return {
        pattern: { frequency: "weekly", interval: 1, daysOfWeek: [...adverb].sort() },
        next: i + 1,
      };
    }
    if (adverb) return this.tail({ frequency: adverb, interval: 1 }, i + 1);

    const plural = this.dayList(i, true);
    if (plural)
      return {
        pattern: { frequency: "weekly", interval: 1, daysOfWeek: plural.days },
        next: plural.next,
      };
    return null;
  }
}

/** The first recurrence phrase in `text`, or null. */
export function findRecurrencePhrase(text: string): RecurrencePhrase | null {
  const words = tokenize(text);
  for (let i = 0; i < words.length; i++) {
    for (const lang of ["en", "de"] as const) {
      const parser = new PhraseParser(words, text, lang);
      const match = parser.at(i);
      if (!match) continue;
      let start = words[i].start;
      // "on mondays" — the "on" belongs to the phrase.
      const before = text.slice(0, start);
      const on = lang === "en" ? /(?:^|\s)(on\s+)$/i.exec(before) : null;
      if (on && PLURAL_WEEKDAYS.en[words[i].key] !== undefined) start -= on[1].length;
      return { start, end: words[match.next - 1].end, pattern: match.pattern };
    }
  }
  return null;
}
