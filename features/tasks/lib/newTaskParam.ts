import { takeUrlFlag } from "@/lib/utils/urlFlag";

/** Query flag the "New task" manifest shortcut adds: /dashboard?new=1 (#80; also works on /today). */
export const NEW_TASK_PARAM = "new";

/** Reads and removes the New task flag (see `takeUrlFlag`). */
export function takeNewTaskParam(search: string): { open: boolean; search: string } {
  const { set, search: rest } = takeUrlFlag(search, NEW_TASK_PARAM);
  return { open: set, search: rest };
}
