/**
 * Drizzle schema of MorgenMachIch's own tables (schema `public`, #307).
 * Design and reasons: comment on #307 / PLANNING.md. The API shapes stay the
 * Zod schemas in `lib/types`; the service layer (#308) maps rows ↔ objects.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { RecurrenceRule } from "@/lib/types";

/* ── Neon Auth (read-only reference, never migrated: schemaFilter = public) ── */

const neonAuth = pgSchema("neon_auth");
/** Users live in Neon Auth's own schema (#306); we only reference the id. */
const authUsers = neonAuth.table("user", { id: uuid("id").primaryKey() });

/* ── Shared building blocks ── */

export const taskStatus = pgEnum("task_status", ["open", "done", "skipped"]);
export const priority = pgEnum("priority", ["none", "low", "medium", "high"]);
/** Who wrote a row — set by the server from the session or API key, never from the body. */
export const recordSource = pgEnum("record_source", ["ui", "n8n", "claude", "import"]);

/** Fractional order keys (#75) compare byte-wise, like the app's plain string compare. */
const textCollateC = customType<{ data: string }>({
  dataType: () => 'text COLLATE "C"',
});

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

const owner = () =>
  uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });

/** created/updated/deleted + source: every row a client can create. */
const lifecycle = {
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  /** Soft delete, so `updatedSince` can report deletions (#310). */
  deletedAt: timestamptz("deleted_at"),
  source: recordSource("source").notNull().default("ui"),
};

/* ── Tables ── */

export const labels = pgTable(
  "labels",
  {
    id: uuid("id").primaryKey(),
    userId: owner(),
    name: text("name").notNull(),
    /** One of the 12 palette hexes — validated by `LabelSchema`. */
    color: text("color").notNull(),
    ...lifecycle,
  },
  (t) => [
    index("labels_user_idx")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const taskSeries = pgTable(
  "task_series",
  {
    id: uuid("id").primaryKey(),
    userId: owner(),
    title: text("title").notNull(),
    notes: text("notes"),
    priority: priority("priority").notNull().default("none"),
    /** Validated with `RecurrenceRuleSchema`; never queried column by column. */
    recurrence: jsonb("recurrence").$type<RecurrenceRule>().notNull(),
    startDate: timestamptz("start_date").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    active: boolean("active").notNull().default(true),
    /** Titles copied into each new occurrence; never queried. */
    subtaskTemplate: jsonb("subtask_template")
      .$type<{ title: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...lifecycle,
  },
  (t) => [
    index("task_series_user_idx")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey(),
    userId: owner(),
    /** Deleting a series can keep its tasks as standalone tasks (#148). */
    seriesId: uuid("series_id").references(() => taskSeries.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    notes: text("notes"),
    status: taskStatus("status").notNull().default("open"),
    priority: priority("priority").notNull().default("none"),
    dueDate: timestamptz("due_date"),
    allDay: boolean("all_day").notNull().default(false),
    completedAt: timestamptz("completed_at"),
    /** The local day an occurrence belongs to — the generator's dedupe key (#312). */
    occurrenceDate: date("occurrence_date", { mode: "string" }),
    sortOrder: textCollateC("sort_order"),
    ...lifecycle,
  },
  (t) => [
    // A soft-deleted occurrence keeps its slot, so the generator never recreates it.
    // Its leading column also serves lookups by series, so no separate series index.
    uniqueIndex("tasks_series_occurrence_uq").on(t.seriesId, t.occurrenceDate),
    index("tasks_user_due_idx")
      .on(t.userId, t.dueDate)
      .where(sql`${t.deletedAt} is null`),
    index("tasks_user_updated_idx").on(t.userId, t.updatedAt),
    check(
      "tasks_occurrence_needs_date",
      sql`${t.seriesId} is null or ${t.occurrenceDate} is not null`,
    ),
  ],
);

export const subtasks = pgTable(
  "subtasks",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: owner(),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    sortOrder: textCollateC("sort_order").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("subtasks_task_idx").on(t.taskId)],
);

export const taskLabels = pgTable(
  "task_labels",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.labelId] }),
    index("task_labels_label_idx").on(t.labelId),
  ],
);

export const seriesLabels = pgTable(
  "series_labels",
  {
    seriesId: uuid("series_id")
      .notNull()
      .references(() => taskSeries.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.labelId] }),
    index("series_labels_label_idx").on(t.labelId),
  ],
);

export const appSettings = pgTable("app_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  statsSince: timestamptz("stats_since"),
  /** IANA zone (e.g. "Europe/Berlin"): occurrence dates are local days, Render runs in UTC. */
  timeZone: text("time_zone").notNull(),
  /** The user's local day of the last occurrence top-up — lazy generation runs once a day (#312). */
  occurrencesGeneratedOn: date("occurrences_generated_on", { mode: "string" }),
  updatedAt: timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
