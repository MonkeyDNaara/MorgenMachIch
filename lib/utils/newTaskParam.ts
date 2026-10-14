/** Query flag the "New task" manifest shortcut adds: /today?new=1 (#80). */
export const NEW_TASK_PARAM = "new";

/**
 * Reads the New task flag from a location's query string and returns the
 * query without it, so the URL can be cleaned and a reload doesn't reopen
 * the drawer. Other parameters are kept.
 */
export function takeNewTaskParam(search: string): {
  open: boolean;
  search: string;
} {
  const params = new URLSearchParams(search);
  if (params.get(NEW_TASK_PARAM) !== "1") return { open: false, search };
  params.delete(NEW_TASK_PARAM);
  const rest = params.toString();
  return { open: true, search: rest ? `?${rest}` : "" };
}
