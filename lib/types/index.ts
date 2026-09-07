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

export const RecurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().positive(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  endDate: z.string().nullable().optional(),
});
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
  startDate: z.string(),
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
