import Dexie, { type Table } from "dexie";
import type { Task, TaskSeries, Label } from "@/lib/types";

/**
 * Local IndexedDB database (via Dexie). This is the only file that should
 * ever import Dexie directly — everything else goes through the
 * repository functions built on top of it (issue #21), keeping a future
 * swap to a real backend contained to lib/db.
 *
 * Indexes are chosen for the queries the app actually needs:
 * - status:    today/list view status filtering ("open" is the common case)
 * - dueDate:   today/overdue computation, calendar view, sorting
 * - seriesId:  finding all occurrences generated from a recurring series
 * - *labelIds: multi-entry index — "tasks with label X" without a full scan
 * - createdAt: sorting
 * - active:    filtering paused series out of occurrence generation
 *
 * No index on priority: the local dataset is small enough to filter that
 * in memory after an indexed status/date lookup, so a dedicated index
 * would add complexity without a real performance benefit.
 */
export class MorgenDB extends Dexie {
  tasks!: Table<Task, string>;
  taskSeries!: Table<TaskSeries, string>;
  labels!: Table<Label, string>;

  constructor() {
    super("MorgenMachIchDB");
    this.version(1).stores({
      tasks: "id, status, dueDate, seriesId, *labelIds, createdAt",
      taskSeries: "id, active",
      labels: "id, name",
    });
  }
}

export const db = new MorgenDB();
