import type { Label, Priority, RecurrenceRule, Subtask, Task, TaskSeries } from "@/lib/types";
import type { LabelColorHex } from "@/lib/constants/labelColors";
import { keysBetween } from "@/lib/utils/orderKey";
import { occurrenceDueIso, occurrencesBetween } from "@/lib/utils/recurrence";

/**
 * Sample data for "Try it with sample data" (#84): a believable week in
 * the life of the app, built relative to `now` so it never looks stale.
 * Pure — no database, no clock, no randomness (ids come from `makeId`),
 * so the same `now` always gives the same data and every rule below is
 * unit-tested. All dates are built from local date parts.
 *
 * What it contains:
 * - 6 labels
 * - 4 recurring series with their past occurrences (done, or skipped on
 *   the two "day off" dates) and their open occurrences from today up to
 *   `horizonDays` — so the occurrence generator has nothing left to add
 * - today: open tasks (one with subtasks) and two already done
 * - two overdue tasks, upcoming tasks over the next two weeks
 * - five backlog tasks in a manual order
 * - 30 days of completed tasks: a current streak, an older best streak
 *   (two days off in between) and a few late completions for the
 *   on-time rate
 */
export type SampleData = { labels: Label[]; taskSeries: TaskSeries[]; tasks: Task[] };

/** Days without any completion, so the streak has a past and a present. */
export const SAMPLE_DAYS_OFF = [9, 19];
const HISTORY_DAYS = 30;

type LabelKey = "work" | "personal" | "health" | "home" | "learning" | "errands";

const LABELS: Record<LabelKey, { name: string; color: LabelColorHex }> = {
  work: { name: "Work", color: "#6eb0ff" },
  personal: { name: "Personal", color: "#a5a0ff" },
  health: { name: "Health", color: "#7cc36c" },
  home: { name: "Home", color: "#e69c3a" },
  learning: { name: "Learning", color: "#00c9c1" },
  errands: { name: "Errands", color: "#f68f5f" },
};

type OneOff = {
  title: string;
  label: LabelKey;
  priority: Priority;
  /** Day relative to today; null = backlog. */
  day: number | null;
  /** "HH:MM", or null for all-day. */
  time: string | null;
  subtasks?: [string, boolean][];
  notes?: string;
};

const TODAY_OPEN: OneOff[] = [
  {
    title: "Submit tax return",
    label: "personal",
    priority: "high",
    day: 0,
    time: "14:00",
    subtasks: [
      ["Collect receipts", true],
      ["Fill in the forms", true],
      ["Upload and send", false],
    ],
  },
  { title: "Prepare the sprint demo", label: "work", priority: "medium", day: 0, time: "10:30" },
  { title: "Call mom", label: "personal", priority: "none", day: 0, time: "19:00" },
  {
    title: "Buy groceries",
    label: "errands",
    priority: "low",
    day: 0,
    time: null,
    subtasks: [
      ["Coffee", false],
      ["Oat milk", false],
      ["Bread", false],
    ],
  },
];

const TODAY_DONE: (OneOff & { doneAt: string })[] = [
  {
    title: "Morning run",
    label: "health",
    priority: "none",
    day: 0,
    time: "07:00",
    doneAt: "07:20",
  },
  {
    title: "Reply to the recruiter",
    label: "work",
    priority: "medium",
    day: 0,
    time: null,
    doneAt: "08:45",
  },
];

const OVERDUE: OneOff[] = [
  { title: "Book a passport appointment", label: "errands", priority: "high", day: -2, time: null },
  { title: "Read chapter 4: graphs", label: "learning", priority: "medium", day: -1, time: null },
];

const UPCOMING: OneOff[] = [
  { title: "Dentist", label: "health", priority: "medium", day: 1, time: "09:30" },
  { title: "Team retro", label: "work", priority: "none", day: 2, time: "15:00" },
  {
    title: "Finish the React course module",
    label: "learning",
    priority: "medium",
    day: 3,
    time: null,
  },
  { title: "Car service", label: "errands", priority: "low", day: 5, time: "08:00" },
  { title: "Birthday dinner", label: "personal", priority: "medium", day: 6, time: "19:30" },
  { title: "Book the summer holiday", label: "personal", priority: "low", day: 9, time: null },
  {
    title: "Portfolio review with my mentor",
    label: "learning",
    priority: "high",
    day: 12,
    time: "17:00",
    notes: "Bring the **landing page** and the test numbers.",
  },
];

const BACKLOG: OneOff[] = [
  {
    title: "Learn the Docker basics",
    label: "learning",
    priority: "medium",
    day: null,
    time: null,
  },
  {
    title: "Write a blog post about MorgenMachIch",
    label: "learning",
    priority: "low",
    day: null,
    time: null,
  },
  { title: "Fix the bike light", label: "home", priority: "low", day: null, time: null },
  { title: "Plan the balcony garden", label: "home", priority: "none", day: null, time: null },
  { title: "Try a new pasta recipe", label: "personal", priority: "none", day: null, time: null },
];

/** Finished in the past 30 days (cycled through), giving stats something to show. */
const HISTORY_POOL: { title: string; label: LabelKey; priority: Priority }[] = [
  { title: "Code review", label: "work", priority: "medium" },
  { title: "Python exercise", label: "learning", priority: "none" },
  { title: "Laundry", label: "home", priority: "none" },
  { title: "Answer emails", label: "work", priority: "low" },
  { title: "Evening walk", label: "health", priority: "none" },
  { title: "Pay the electricity bill", label: "errands", priority: "high" },
  { title: "TypeScript kata", label: "learning", priority: "low" },
  { title: "Clean the kitchen", label: "home", priority: "none" },
  { title: "Stand-up notes", label: "work", priority: "none" },
  { title: "Post office", label: "errands", priority: "low" },
];
/** Completions per history day (cycled), never zero except the days off. */
const HISTORY_COUNTS = [2, 3, 1, 4, 2, 1, 3];

type SeriesSpec = {
  key: string;
  title: string;
  label: LabelKey;
  priority: Priority;
  recurrence: RecurrenceRule;
  /** Start relative to today, or "month" for the 1st of the month two months back. */
  start: number | "month";
  time: string | null;
  subtasks?: string[];
};

const SERIES: SeriesSpec[] = [
  {
    key: "gym",
    title: "Gym",
    label: "health",
    priority: "medium",
    recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1, 4] },
    start: -21,
    time: "18:30",
    subtasks: ["Warm-up", "Strength", "Stretching"],
  },
  {
    key: "plants",
    title: "Water the plants",
    label: "home",
    priority: "low",
    recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [3, 6] },
    start: -21,
    time: null,
  },
  {
    key: "review",
    title: "Weekly review",
    label: "work",
    priority: "none",
    recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [5] },
    start: -21,
    time: "16:00",
  },
  {
    key: "rent",
    title: "Pay the rent",
    label: "home",
    priority: "high",
    recurrence: { frequency: "monthly", interval: 1, monthlyMode: "dayOfMonth", dayOfMonth: 1 },
    start: "month",
    time: null,
  },
];

export function buildSampleData(
  now: Date,
  makeId: () => string = () => crypto.randomUUID(),
  horizonDays = 60,
): SampleData {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (offset: number, time: string | null = null): Date => {
    const [hours, minutes] = time ? time.split(":").map(Number) : [0, 0];
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset,
      hours,
      minutes,
    );
  };
  /** Never in the future: a "done at 18:30" today becomes "a moment ago" before 18:30. */
  const past = (date: Date): Date => {
    const latest = new Date(now.getTime() - 60_000);
    return date > latest ? (latest < today ? today : latest) : date;
  };
  const iso = (date: Date) => date.toISOString();

  const labelIds = {} as Record<LabelKey, string>;
  const labels: Label[] = (Object.keys(LABELS) as LabelKey[]).map((key) => {
    labelIds[key] = makeId();
    return { id: labelIds[key], ...LABELS[key], createdAt: iso(day(-HISTORY_DAYS - 5, "09:00")) };
  });

  const tasks: Task[] = [];
  const task = (
    fields: Omit<Task, "id" | "sortOrder" | "subtasks" | "notes"> &
      Partial<Pick<Task, "sortOrder" | "subtasks" | "notes">>,
  ) => {
    const { notes, ...rest } = fields;
    tasks.push({
      id: makeId(),
      subtasks: [],
      sortOrder: null,
      ...rest,
      ...(notes ? { notes } : {}),
    });
  };
  const subtasks = (items: [string, boolean][] = []): Subtask[] =>
    items.map(([title, done]) => ({ id: makeId(), title, done }));

  const oneOff = (item: OneOff, extra: Partial<Task> = {}) => {
    const due = item.day === null ? null : day(item.day, item.time);
    const created = past(day(Math.min(item.day ?? -3, 0) - 3, "08:00"));
    task({
      title: item.title,
      notes: item.notes,
      status: "open",
      priority: item.priority,
      dueDate: due ? iso(due) : null,
      allDay: item.day !== null && item.time === null,
      labelIds: [labelIds[item.label]],
      subtasks: subtasks(item.subtasks),
      seriesId: null,
      createdAt: iso(created),
      updatedAt: iso(created),
      completedAt: null,
      ...extra,
    });
  };

  [...TODAY_OPEN, ...OVERDUE, ...UPCOMING].forEach((item) => oneOff(item));
  for (const item of TODAY_DONE) {
    const doneAt = iso(past(day(0, item.doneAt)));
    oneOff(item, { status: "done", completedAt: doneAt, updatedAt: doneAt });
  }
  const backlogKeys = keysBetween(null, null, BACKLOG.length);
  BACKLOG.forEach((item, index) => oneOff(item, { sortOrder: backlogKeys[index] }));

  // History: completed one-off tasks on each of the last 30 days except the days off.
  let poolIndex = 0;
  for (let offset = 1; offset <= HISTORY_DAYS; offset++) {
    if (SAMPLE_DAYS_OFF.includes(offset)) continue;
    const count = HISTORY_COUNTS[offset % HISTORY_COUNTS.length];
    for (let n = 0; n < count; n++) {
      const item = HISTORY_POOL[poolIndex++ % HISTORY_POOL.length];
      // Every fifth one was finished two days late, for a realistic on-time rate.
      const late = poolIndex % 5 === 0;
      const due = day(-offset - (late ? 2 : 0));
      const doneAt = iso(day(-offset, `${9 + n * 3}:${n % 2 === 0 ? "15" : "40"}`));
      task({
        title: item.title,
        status: "done",
        priority: item.priority,
        dueDate: iso(due),
        allDay: true,
        labelIds: [labelIds[item.label]],
        seriesId: null,
        createdAt: iso(day(-offset - 3, "08:00")),
        updatedAt: doneAt,
        completedAt: doneAt,
      });
    }
  }

  // Series: past occurrences done (skipped on a day off), today onwards open.
  const taskSeries: TaskSeries[] = [];
  const horizon = day(horizonDays);
  for (const spec of SERIES) {
    const startDay =
      spec.start === "month"
        ? new Date(today.getFullYear(), today.getMonth() - 2, 1)
        : day(spec.start);
    const start = spec.time
      ? new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), ...hm(spec.time))
      : startDay;
    const series: TaskSeries = {
      id: makeId(),
      title: spec.title,
      priority: spec.priority,
      labelIds: [labelIds[spec.label]],
      subtaskTemplate: (spec.subtasks ?? []).map((title) => ({ title })),
      recurrence: spec.recurrence,
      startDate: iso(start),
      allDay: spec.time === null,
      active: true,
      createdAt: iso(start),
      updatedAt: iso(start),
    };
    taskSeries.push(series);

    const dayBeforeStart = new Date(
      startDay.getFullYear(),
      startDay.getMonth(),
      startDay.getDate() - 1,
    );
    for (const date of occurrencesBetween(spec.recurrence, startDay, dayBeforeStart, horizon)) {
      const due = new Date(occurrenceDueIso(series, date));
      const isPast = date < today;
      const offset = Math.round((today.getTime() - date.getTime()) / 86_400_000);
      const status = !isPast ? "open" : SAMPLE_DAYS_OFF.includes(offset) ? "skipped" : "done";
      const doneAt =
        status === "done"
          ? iso(spec.time ? new Date(due.getTime() + 45 * 60_000) : day(-offset, "10:00"))
          : null;
      task({
        title: series.title,
        status,
        priority: series.priority,
        dueDate: iso(due),
        allDay: series.allDay,
        labelIds: series.labelIds,
        subtasks: series.subtaskTemplate.map(({ title }) => ({
          id: makeId(),
          title,
          done: status === "done",
        })),
        seriesId: series.id,
        createdAt: series.createdAt,
        updatedAt: doneAt ?? series.createdAt,
        completedAt: doneAt,
      });
    }
  }

  return { labels, taskSeries, tasks };
}

function hm(time: string): [number, number] {
  const [hours, minutes] = time.split(":").map(Number);
  return [hours, minutes];
}
