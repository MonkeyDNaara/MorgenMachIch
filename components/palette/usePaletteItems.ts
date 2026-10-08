"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { COMMANDS, type CommandContext } from "@/lib/commands";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";
import { commandIcon } from "@/components/palette/commandIcons";
import type { PaletteItem } from "@/components/palette/types";

/**
 * Turns the command registry (`lib/commands`, #196) into palette rows by
 * giving each command the browser's CommandContext (Next router + the
 * task drawer) and its icon. #197 adds task results to this list.
 */
export function usePaletteItems(): PaletteItem[] {
  const router = useRouter();
  const { openTaskDrawer } = useTaskDrawer();

  return useMemo(() => {
    const context: CommandContext = {
      navigate: (path) => router.push(path),
      openNewTask: () => openTaskDrawer(),
    };
    return COMMANDS.map((command) => ({
      id: command.id,
      label: command.label,
      group: command.group,
      keywords: command.keywords,
      icon: commandIcon(command.id),
      hint: command.hint,
      run: () => command.run(context),
    }));
  }, [router, openTaskDrawer]);
}
