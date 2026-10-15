/** The open-task prefix "(3) " that documentTitle adds. */
const COUNT_PREFIX = /^\(\d+\) /;

/**
 * The tab title with the number of open tasks for today in front (#187):
 * "(3) Today · MorgenMachIch", like a mail app's unread count. Any old
 * prefix is replaced, so calling it again never stacks counts; 0 (or a
 * missing count) shows the plain title.
 */
export function documentTitle(title: string, count: number | undefined): string {
  const base = title.replace(COUNT_PREFIX, "");
  return count && count > 0 ? `(${count}) ${base}` : base;
}
