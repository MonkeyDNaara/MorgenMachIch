/**
 * Reads a one-time flag like `?new=1` from a location's query string and
 * returns the query without it, so the URL can be cleaned and a reload
 * doesn't trigger the action again. Other parameters are kept. Used by
 * the "New task" shortcut (#80) and "Try it with sample data" (#84).
 */
export function takeUrlFlag(search: string, name: string): { set: boolean; search: string } {
  const params = new URLSearchParams(search);
  if (params.get(name) !== "1") return { set: false, search };
  params.delete(name);
  const rest = params.toString();
  return { set: true, search: rest ? `?${rest}` : "" };
}

/** `/today?sample=1` — the landing page's "Try it with sample data" (#84). */
export const SAMPLE_DATA_PARAM = "sample";
