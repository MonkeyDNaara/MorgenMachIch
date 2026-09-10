import { z } from "zod";
import { LABEL_COLOR_HEXES } from "@/lib/constants/labelColors";

/**
 * Shared domain schemas + types (Task, TaskSeries, Subtask, Label).
 *
 * Zod schemas are the single source of truth: TypeScript types are derived
 * from them via `z.infer`, and the same schemas are used by `lib/db` to
 * validate data at the storage boundary (before writing to Dexie, and when
 * reading rows back out). Everything else imports the types from here
 * rather than redeclaring shapes locally.
 */

export const PrioritySchema = z.enum(["none", "low", "medium", "high"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const TaskStatusSchema = z.enum(["open", "done", "skipped"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * Monthly recurrence needs two modes because "the same day every month"
 * (dayOfMonth) and "the same weekday pattern every month" (nthWeekday,
 * e.g. "last Friday") behave differently across months of different
 * lengths — see occurrencesBetween in lib/utils/recurrence.ts for how
 * each is actually computed. n=-1 means "last", 1-4 mean first..fourth.
 */
export const RecurrenceRuleSchema = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.number().int().positive(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // weekly only, 0=Sun..6=Sat
    monthlyMode: z.enum(["dayOfMonth", "nthWeekday"]).optional(), // monthly only
    dayOfMonth: z.number().int().min(1).max(31).optional(), // monthlyMode: "dayOfMonth"
    nthWeekday: z
      .object({
        n: z.number().int().refine((n) => n === -1 || (n >= 1 && n <= 4), {
          message: "n must be 1-4 or -1 (last)",
        }),
        weekday: z.number().int().min(0).max(6),
      })
      .optional(), // monthlyMode: "nthWeekday"
    endDate: z.string().nullable().optional(),
  })
  .refine((rule) => rule.frequency !== "weekly" || (rule.daysOfWeek?.length ?? 0) > 0, {
    message: "Weekly recurrence needs at least one day of the week selected",
    path: ["daysOfWeek"],
  })
  .refine((rule) => rule.frequency !== "monthly" || rule.monthlyMode !== undefined, {
    message: "Monthly recurrence needs a mode (day of month or nth weekday)",
    path: ["monthlyMode"],
  })
  .refine(
    (rule) => rule.frequency !== "monthly" || rule.monthlyMode !== "dayOfMonth" || rule.dayOfMonth !== undefined,
    { message: 'Monthly "day of month" mode needs a day', path: ["dayOfMonth"] },
  )
  .refine(
    (rule) => rule.frequency !== "monthly" || rule.monthlyMode !== "nthWeekday" || rule.nthWeekday !== undefined,
    { message: 'Monthly "nth weekday" mode needs a weekday', path: ["nthWeekday"] },
  );
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  done: z.boolean(),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  notes: z.string().optional(), // Markdown
  status: TaskStatusSchema,
  priority: PrioritySchema,
  dueDate: z.string().nullable(), // ISO datetime
  allDay: z.boolean(),
  labelIds: z.array(z.string()),
  subtasks: z.array(SubtaskSchema),
  seriesId: z.string().nullable(), // set if generated from a recurring series
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskSeriesSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  notes: z.string().optional(),
  priority: PrioritySchema,
  labelIds: z.array(z.string()),
  subtaskTemplate: z.array(z.object({ title: z.string().min(1) })),
  recurrence: RecurrenceRuleSchema,
  startDate: z.string(), // ISO datetime of the first occurrence
  allDay: z.boolean(), // every generated occurrence inherits this (added for #58)
  active: z.boolean(), // pause without deleting
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TaskSeries = z.infer<typeof TaskSeriesSchema>;

export const LabelSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.enum(LABEL_COLOR_HEXES), // one of the 12 fixed palette hexes (lib/constants/labelColors)
  createdAt: z.string(),
});
export type Label = z.infer<typeof LabelSchema>;

/**
 * Input schemas/types for creating new records — omit fields the
 * repository layer generates itself (id, timestamps, derived state).
 */

export const NewTaskSchema = TaskSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});
export type NewTask = z.infer<typeof NewTaskSchema>;

export const NewTaskSeriesSchema = TaskSeriesSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type NewTaskSeries = z.infer<typeof NewTaskSeriesSchema>;

export const NewLabelSchema = LabelSchema.omit({
  id: true,
  createdAt: true,
});
export type NewLabel = z.infer<typeof NewLabelSchema>;
