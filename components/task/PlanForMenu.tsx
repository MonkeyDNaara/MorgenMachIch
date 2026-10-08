"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { Task } from "@/lib/types";
import { updateTask } from "@/lib/db/tasks";
import { planDateOptions, planDueDateIso, toLocalDateKey } from "@/lib/utils/planDateOptions";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";
import { APP_LOCALE } from "@/lib/constants/locale";

type PlanForMenuProps = {
  task: Task;
};

/**
 * "Plan for…" menu on a backlog card (#183): gives a dateless task a
 * due date in one or two clicks — Today, Tomorrow, the rest of this
 * week, or any date via the native picker. Planning sets an all-day due
 * date, which by itself moves the task out of the Backlog column into
 * Tasks (see isBacklogTask); there is no separate "planned" state.
 *
 * Plain React state instead of daisyUI's focus-based dropdown so the
 * menu can close on outside click / Escape and keep the date input
 * usable (a focus-based dropdown closes the moment the picker steals
 * focus).
 */
export default function PlanForMenu({ task }: PlanForMenuProps) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setPicking(false);
  }

  async function plan(dateKey: string) {
    close();
    await updateTask(task.id, { dueDate: planDueDateIso(dateKey), allDay: true });
  }

  const options = open ? planDateOptions() : [];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Plan for…"
        title="Plan for…"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-base-content/40 outline-none! transition-colors hover:bg-base-300 hover:text-base-content/70"
      >
        <CalendarPlus size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-48 rounded-box border border-base-content/10 bg-base-300 p-1 shadow-lg shadow-black/30"
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitem"
              onClick={() => plan(option.key)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-field px-2 py-1.5 text-left text-sm outline-none! transition-colors hover:bg-base-100/60 focus-visible:bg-base-100/60"
            >
              <span>{option.label}</span>
              <span className="font-mono text-xs text-base-content/40">
                {option.date.toLocaleDateString(APP_LOCALE, { month: "short", day: "numeric" })}
              </span>
            </button>
          ))}
          {picking ? (
            <input
              type="date"
              autoFocus
              min={toLocalDateKey(new Date())}
              aria-label="Pick a due date"
              onChange={(event) => {
                if (event.target.value) plan(event.target.value);
              }}
              className={`input input-sm mt-1 w-full ${FIELD_FOCUS}`}
            />
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setPicking(true)}
              className="mt-0.5 flex w-full cursor-pointer items-center rounded-field border-t border-base-content/10 px-2 py-1.5 text-left text-sm text-base-content/70 outline-none! transition-colors hover:bg-base-100/60 focus-visible:bg-base-100/60"
            >
              Pick date…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
