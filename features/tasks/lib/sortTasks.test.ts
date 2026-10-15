import { describe, expect, it } from "vitest";
import { sortTasks } from "@/features/tasks/lib/sortTasks";
import { localIso, makeTask } from "@/lib/test/factories";

const tasks = [
  makeTask({ id: "later", dueDate: localIso(2026, 10, 20), createdAt: localIso(2026, 10, 1) }),
  makeTask({ id: "none", dueDate: null, createdAt: localIso(2026, 10, 5) }),
  makeTask({ id: "sooner", dueDate: localIso(2026, 10, 10, 9), createdAt: localIso(2026, 10, 3) }),
  makeTask({ id: "soonest", dueDate: localIso(2026, 10, 10, 8), createdAt: localIso(2026, 9, 1) }),
];
const ids = (list: { id: string }[]) => list.map((t) => t.id);

describe("sortTasks (#123)", () => {
  it("sorts by due date, soonest first, undated last", () => {
    expect(ids(sortTasks(tasks, "dueDate"))).toEqual(["soonest", "sooner", "later", "none"]);
  });

  it("sorts by creation, newest first", () => {
    expect(ids(sortTasks(tasks, "createdAt"))).toEqual(["none", "sooner", "later", "soonest"]);
  });

  it("does not change the input", () => {
    sortTasks(tasks, "dueDate");
    expect(ids(tasks)).toEqual(["later", "none", "sooner", "soonest"]);
  });
});
