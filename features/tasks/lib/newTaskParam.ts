import { takeUrlFlag } from "@/lib/utils/urlFlag";

/** Query flag the "New task" manifest shortcut adds: /today?new=1 (#80). */
export const NEW_TASK_PARAM = "new";

/** Reads and removes the New task flag (see `takeUrlFlag`). */
export function takeNewTaskParam(search: string): { open: boolean; search: string } {
  const { set, search: rest } = takeUrlFlag(search, NEW_TASK_PARAM);
  return { open: set, search: rest };
}
