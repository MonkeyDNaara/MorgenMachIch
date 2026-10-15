import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";
import { dayAnnouncement, listAnnouncement } from "@/features/dnd/lib/dndAnnouncements";

/**
 * Adapters from dnd-kit's announcement callbacks to our texts (#355).
 * dnd-kit passes the dragged item (`active`) and what it is over (`over`);
 * the callers only need to say how to name things.
 */

type Titled = (id: UniqueIdentifier) => string;

/** The 0-based index and list length dnd-kit's sortable preset stores on
 * each item's `data.current.sortable`. */
function sortableIndex(data: unknown): { index: number; total: number } | null {
  const sortable = (data as { sortable?: { index: number; items: unknown[] } } | undefined)
    ?.sortable;
  return sortable ? { index: sortable.index, total: sortable.items.length } : null;
}

/** For a `SortableContext` list: "Picked up …", "moved to position …". */
export function createListAnnouncements(titleOf: Titled): Announcements {
  const say = (
    text: (title: string, index: number, total: number) => string,
    id: UniqueIdentifier,
    data: unknown,
  ) => {
    const at = sortableIndex(data);
    return at ? text(titleOf(id), at.index, at.total) : undefined;
  };
  return {
    onDragStart: ({ active }) => say(listAnnouncement.pickedUp, active.id, active.data.current),
    onDragOver: ({ active, over }) =>
      over ? say(listAnnouncement.movedTo, active.id, over.data.current) : undefined,
    onDragEnd: ({ active, over }) =>
      over ? say(listAnnouncement.dropped, active.id, over.data.current) : undefined,
    onDragCancel: ({ active }) => say(listAnnouncement.cancelled, active.id, active.data.current),
  };
}

/** For day drop targets: `dayOf` turns a droppable id into its day and
 * whether a drop is allowed there (null = not a day). */
export function createDayAnnouncements(
  titleOf: Titled,
  dayOf: (overId: UniqueIdentifier) => { day: Date; allowed: boolean } | null,
): Announcements {
  return {
    onDragStart: ({ active }) => dayAnnouncement.pickedUp(titleOf(active.id)),
    onDragOver: ({ over }) => {
      const target = over ? dayOf(over.id) : null;
      return target ? dayAnnouncement.over(target.day, target.allowed) : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const target = over ? dayOf(over.id) : null;
      return target?.allowed
        ? dayAnnouncement.dropped(titleOf(active.id), target.day)
        : dayAnnouncement.notMoved(titleOf(active.id));
    },
    onDragCancel: ({ active }) => dayAnnouncement.cancelled(titleOf(active.id)),
  };
}
