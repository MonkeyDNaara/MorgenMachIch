import { APP_LOCALE } from "@/lib/constants/locale";

/**
 * Screen-reader texts for drag & drop (#355), pure so every list and day
 * target says the same thing and Vitest can check them. dnd-kit reads them
 * out through its live region (see `lib/ui/dnd/announcements.ts`).
 *
 * Positions are 1-based ("Position 1 of 7"), days use the app's short
 * date ("Thu 15 Oct", without en-GB's comma after the weekday).
 */

/** Read when a drag handle gets focus (dnd-kit `screenReaderInstructions`). */
export const LIST_DRAG_INSTRUCTIONS =
  "To move this task, press Space or Enter. Use the up and down arrow keys to choose a new place, then press Space or Enter to drop it, or Escape to cancel.";

export const DAY_DRAG_INSTRUCTIONS =
  "To move this task to another day, press Space or Enter. Use the arrow keys to choose a day, then press Space or Enter to drop it, or Escape to cancel.";

/** "Thu 15 Oct" in APP_LOCALE. */
export function formatDropDay(day: Date): string {
  return new Intl.DateTimeFormat(APP_LOCALE, { weekday: "short", day: "numeric", month: "short" })
    .formatToParts(day)
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join(" ");
}

const position = (index: number, total: number) => `position ${index + 1} of ${total}`;

/** Texts for reordering inside one list; `index` is 0-based. */
export const listAnnouncement = {
  pickedUp: (title: string, index: number, total: number) =>
    `Picked up “${title}”. Now at ${position(index, total)}.`,
  movedTo: (title: string, index: number, total: number) =>
    `“${title}” moved to ${position(index, total)}.`,
  dropped: (title: string, index: number, total: number) =>
    `Dropped “${title}” at ${position(index, total)}.`,
  cancelled: (title: string, index: number, total: number) =>
    `Cancelled. “${title}” is back at ${position(index, total)}.`,
};

/** Texts for moving a task onto a day (calendar, Coming up, Backlog tray). */
export const dayAnnouncement = {
  pickedUp: (title: string) => `Picked up “${title}”. Choose a day.`,
  over: (day: Date, allowed: boolean) =>
    allowed
      ? `Over ${formatDropDay(day)}.`
      : `${formatDropDay(day)} is in the past — can't drop here.`,
  dropped: (title: string, day: Date) => `Moved “${title}” to ${formatDropDay(day)}.`,
  notMoved: (title: string) => `“${title}” wasn't moved.`,
  cancelled: (title: string) => `Cancelled. “${title}” wasn't moved.`,
};
