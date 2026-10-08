"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarPlus, Circle, CircleCheck, Inbox } from "lucide-react";
import { COMMANDS, type CommandContext } from "@/lib/commands";
import { createTask, getTasks, updateTask } from "@/lib/db/tasks";
import type { Label, Task } from "@/lib/types";
import { formatDueDate } from "@/lib/utils/formatDueDate";
import { formatQuickAddDue } from "@/lib/utils/formatQuickAddDue";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";
import { tokenColor, tokenLabel } from "@/components/quickadd/tokenDisplay";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";
import { useCommandPalette } from "@/components/palette/CommandPaletteProvider";
import { commandIcon } from "@/components/palette/commandIcons";
import type { PaletteItem } from "@/components/palette/types";

/** Done tasks still show up, but below every open match. */
const DONE_PENALTY = 20;

/**
 * Everything the palette can list for the current query: the command
 * registry (`lib/commands`, #196) plus, while something is typed, the
 * user's tasks and an Add action (#197). Since #204 the Add action uses
 * the quick-add parse of the query: "Call mom fri 3pm #family !high"
 * adds "Call mom" with that date, label and priority, and only a task
 * without a date lands in the backlog.
 *
 * Tasks come from a live query, so completing one with Cmd/Ctrl+Enter
 * updates its row in place. Recurring occurrences are left out — a
 * series would list dozens of identical titles; they stay reachable via
 * Today and Tasks. The hook only runs while the palette is open (its body
 * is unmounted when closed), so the query costs nothing otherwise.
 */
export function usePaletteItems(
  query: string,
  quickAdd: QuickAddResult,
  labels: Label[],
): PaletteItem[] {
  const router = useRouter();
  const { openTaskDrawer } = useTaskDrawer();
  const { notify } = useCommandPalette();
  const tasks = useLiveQuery(getTasks, []);

  return useMemo(() => {
    const context: CommandContext = {
      navigate: (path) => router.push(path),
      openNewTask: () => openTaskDrawer(),
    };
    const items: PaletteItem[] = COMMANDS.map((command) => ({
      id: command.id,
      kind: "command",
      label: command.label,
      group: command.group,
      keywords: command.keywords,
      icon: commandIcon(command.id),
      hint: command.hint,
      run: () => command.run(context),
    }));

    if (!query.trim()) return items;

    // Only tokens and no title ("fri #family") can't become a task.
    const { title, dueDate, allDay, labelIds, priority, tokens } = quickAdd;
    if (title) {
      const now = new Date();
      const where = dueDate ? `for ${formatQuickAddDue(dueDate, allDay, now)}` : "to the backlog";
      items.push({
        id: "add-task",
        kind: "command",
        label: dueDate ? `Add “${title}”` : `Add “${title}” to backlog`,
        group: "Actions",
        icon: dueDate ? CalendarPlus : Inbox,
        pinned: true,
        preferred: tokens.length > 0,
        chips: tokens.map((token) => ({
          key: token.id,
          text: tokenLabel(token, labels, now),
          color: tokenColor(token, labels),
        })),
        run: () => {
          createTask({
            title,
            priority: priority ?? "none",
            dueDate,
            allDay: dueDate ? allDay : false,
            labelIds,
            subtasks: [],
            seriesId: null,
          }).then(
            () => notify(`Added “${title}” ${where}`),
            () => notify(`Couldn't add “${title}” — try again`),
          );
        },
      });
    }

    for (const task of tasks ?? []) {
      if (task.seriesId !== null || task.status === "skipped") continue;
      items.push(taskItem(task, openTaskDrawer));
    }
    return items;
  }, [router, openTaskDrawer, notify, tasks, query, quickAdd, labels]);
}

function taskItem(task: Task, openTaskDrawer: (taskId?: string) => void): PaletteItem {
  const done = task.status === "done";
  return {
    id: `task-${task.id}`,
    kind: "task",
    label: task.title,
    group: "Tasks",
    icon: done ? CircleCheck : Circle,
    hint: task.dueDate ? formatDueDate(task.dueDate, task.allDay) : "backlog",
    priority: task.priority,
    muted: done,
    rankPenalty: done ? DONE_PENALTY : 0,
    run: () => openTaskDrawer(task.id),
    alternate: {
      label: done ? `Marked “${task.title}” as not done` : `Marked “${task.title}” as done`,
      // Same toggle as the card's status circle.
      run: () => {
        void updateTask(task.id, {
          status: done ? "open" : "done",
          completedAt: done ? null : new Date().toISOString(),
        });
      },
    },
  };
}
