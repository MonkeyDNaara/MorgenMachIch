"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, LayoutList, Sun } from "lucide-react";
import type { PaletteItem } from "@/components/palette/types";

/**
 * The palette's item list. For now (#195) a hardcoded placeholder so the
 * shell can be exercised end to end; #196 replaces this with the real
 * command registry in `lib/commands`, and #197 adds task results.
 */
export function usePaletteItems(): PaletteItem[] {
  const router = useRouter();

  return useMemo(
    () => [
      {
        id: "go-today",
        label: "Today",
        group: "Pages",
        icon: Sun,
        hint: "/today",
        run: () => router.push("/today"),
      },
      {
        id: "go-tasks",
        label: "Tasks",
        group: "Pages",
        icon: LayoutList,
        hint: "/tasks",
        run: () => router.push("/tasks"),
      },
      {
        id: "go-calendar",
        label: "Calendar",
        group: "Pages",
        icon: Calendar,
        hint: "/calendar",
        run: () => router.push("/calendar"),
      },
    ],
    [router],
  );
}
