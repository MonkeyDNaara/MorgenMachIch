import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { AppSettingsSchema, LabelSchema, TaskSchema, TaskSeriesSchema } from "@/lib/types";
import {
  appSettings,
  labels,
  seriesLabels,
  subtasks,
  taskLabels,
  taskSeries,
  tasks,
} from "@/server/db/schema";

/**
 * #307 acceptance: every field of the API schemas in `lib/types` has a home in the
 * database. A new Zod field without a column (or an entry here) fails this test.
 */
function columnsOf(table: Parameters<typeof getTableColumns>[0]) {
  return Object.keys(getTableColumns(table));
}

describe("schema covers the API types", () => {
  it("Task: own columns, labels in task_labels, subtasks in subtasks", () => {
    const elsewhere = { labelIds: taskLabels, subtasks };
    for (const field of Object.keys(TaskSchema.shape)) {
      if (field in elsewhere) continue;
      expect(columnsOf(tasks), `tasks.${field}`).toContain(field);
    }
    expect(columnsOf(taskLabels)).toEqual(["taskId", "labelId"]);
    expect(columnsOf(subtasks)).toEqual(
      expect.arrayContaining(["id", "title", "done", "sortOrder"]),
    );
  });

  it("TaskSeries: own columns, labels in series_labels", () => {
    for (const field of Object.keys(TaskSeriesSchema.shape)) {
      if (field === "labelIds") continue;
      expect(columnsOf(taskSeries), `task_series.${field}`).toContain(field);
    }
    expect(columnsOf(seriesLabels)).toEqual(["seriesId", "labelId"]);
  });

  it("Label", () => {
    for (const field of Object.keys(LabelSchema.shape)) {
      expect(columnsOf(labels), `labels.${field}`).toContain(field);
    }
  });

  it("AppSettings: one row per user instead of the fixed id", () => {
    for (const field of Object.keys(AppSettingsSchema.shape)) {
      if (field === "id") continue; // "app" becomes user_id
      expect(columnsOf(appSettings), `app_settings.${field}`).toContain(field);
    }
    expect(columnsOf(appSettings)).toEqual(expect.arrayContaining(["userId", "timeZone"]));
  });

  it("every owned table carries user_id and the lifecycle columns", () => {
    for (const table of [labels, taskSeries, tasks]) {
      expect(columnsOf(table)).toEqual(
        expect.arrayContaining(["userId", "createdAt", "updatedAt", "deletedAt", "source"]),
      );
    }
    expect(columnsOf(subtasks)).toContain("userId");
  });
});
