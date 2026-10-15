import { createStoredFlag } from "@/lib/storage/storedFlag";

/** Whether /tasks shows the Backlog column (#182); default visible. The
 * key and its "0"/"1" values are unchanged since #182. */
const backlogVisible = createStoredFlag("morgenmachich:backlogVisible", true);

export const readBacklogVisible = backlogVisible.read;
export const writeBacklogVisible = backlogVisible.write;
export const subscribeBacklogVisible = backlogVisible.subscribe;

/** Whether /calendar shows the Backlog tray (#357); default hidden. */
export const calendarBacklogVisible = createStoredFlag(
  "morgenmachich:calendarBacklogVisible",
  false,
);
