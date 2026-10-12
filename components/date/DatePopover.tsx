"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { APP_LOCALE } from "@/lib/constants/locale";
import { getMonthGrid } from "@/lib/utils/monthGrid";
import { parseDateOnly } from "@/lib/utils/parseDateOnly";
import { toLocalDateKey } from "@/lib/utils/planDateOptions";
import { moveDateFocus, quickDateOptions } from "@/lib/utils/dateField";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type DatePopoverProps = {
  /** Selected date as "YYYY-MM-DD", or "" for none. */
  value: string;
  /** Earliest allowed date ("YYYY-MM-DD"); earlier days are disabled. */
  min?: string;
  /** Show "Clear date". */
  clearable: boolean;
  now: Date;
  /** A day, a quick pick or "" (clear) was chosen. */
  onPick: (key: string) => void;
  /** Close without picking (the phone sheet's scrim). */
  onClose: () => void;
};

/**
 * The DateField's popover (#258): quick picks, a Monday-first month grid
 * from getMonthGrid (today ringed in accent, the selected day filled) and
 * an optional "Clear date". The grid is one tab stop (roving tabindex):
 * arrows move by day/week, Home/End to the week's ends, PageUp/PageDown
 * by month, Enter/Space picks. Escape and outside clicks are handled by
 * the field (useDismiss). Below `sm` it is a bottom sheet over a scrim.
 */
export default function DatePopover({
  value,
  min,
  clearable,
  now,
  onPick,
  onClose,
}: DatePopoverProps) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const initial = value
    ? parseDateOnly(value)
    : min && parseDateOnly(min) > today
      ? parseDateOnly(min)
      : today;
  const [focused, setFocused] = useState<Date>(initial);
  // Focus follows the focused day on open and on keyboard moves, but not
  // when the month buttons change the view (focus stays on the button).
  const [focusGrid, setFocusGrid] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<HTMLButtonElement>(null);
  const minDate = min ? parseDateOnly(min) : null;

  const days = getMonthGrid(focused.getFullYear(), focused.getMonth(), now);
  const focusedKey = toLocalDateKey(focused);
  const monthLabel = focused.toLocaleDateString(APP_LOCALE, { month: "long", year: "numeric" });
  const isDisabled = (date: Date) => minDate !== null && date < minDate;

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    if (focusGrid) focusedRef.current?.focus();
  }, [focusedKey, focusGrid]);

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = moveDateFocus(event.key, focused);
    if (next === null) return;
    event.preventDefault();
    setFocusGrid(true);
    setFocused(next);
  }

  function showMonth(step: number) {
    setFocusGrid(false);
    setFocused(new Date(focused.getFullYear(), focused.getMonth() + step, 1));
  }

  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-scrim sm:hidden" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Choose a date"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line-strong bg-base-200 p-3 pb-6 shadow-overlay sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[19rem] sm:rounded-xl sm:border sm:pb-3"
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong sm:hidden" />
        <div className="grid grid-cols-2 gap-1 border-b border-line pb-2.5">
          {quickDateOptions(now).map((option) => {
            const disabled = isDisabled(parseDateOnly(option.key));
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onPick(option.key)}
                className="flex cursor-pointer items-baseline justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none! transition-colors hover:bg-line focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-40"
              >
                {option.label}
                <span className="font-mono text-meta text-faint">
                  {parseDateOnly(option.key).toLocaleDateString(APP_LOCALE, {
                    weekday: "short",
                    day: "numeric",
                  })}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-1 pt-2.5 pb-1.5">
          <button
            type="button"
            onClick={() => showMonth(-1)}
            aria-label="Previous month"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted outline-none! transition-colors hover:bg-line hover:text-base-content focus-visible:shadow-focus"
          >
            <ChevronLeft size={16} />
          </button>
          <p aria-live="polite" className="text-heading">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => showMonth(1)}
            aria-label="Next month"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted outline-none! transition-colors hover:bg-line hover:text-base-content focus-visible:shadow-focus"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div role="grid" aria-label={monthLabel} onKeyDown={handleGridKeyDown}>
          <div role="row" className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                role="columnheader"
                className="py-1 text-center font-mono text-[10px] tracking-[0.08em] text-faint uppercase"
              >
                {day}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={toLocalDateKey(week[0].date)} role="row" className="grid grid-cols-7 gap-0.5">
              {week.map(({ date, isCurrentMonth, isToday }) => {
                const key = toLocalDateKey(date);
                const selected = key === value;
                const isFocused = key === focusedKey;
                const disabled = isDisabled(date);
                return (
                  <button
                    key={key}
                    ref={isFocused ? focusedRef : undefined}
                    type="button"
                    role="gridcell"
                    aria-selected={selected}
                    aria-current={isToday ? "date" : undefined}
                    aria-disabled={disabled || undefined}
                    tabIndex={isFocused ? 0 : -1}
                    onClick={() => !disabled && onPick(key)}
                    aria-label={date.toLocaleDateString(APP_LOCALE, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    className={`flex aspect-square items-center justify-center rounded-lg border font-mono text-xs outline-none! transition-colors focus-visible:shadow-focus sm:text-meta ${
                      selected
                        ? "border-transparent bg-accent font-medium text-accent-content"
                        : isToday
                          ? "border-accent text-accent hover:bg-line"
                          : `border-transparent hover:bg-line ${isCurrentMonth ? "" : "text-faint"}`
                    } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : "cursor-pointer"}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-line px-1 pt-2">
          {clearable && value ? (
            <button
              type="button"
              onClick={() => onPick("")}
              className="cursor-pointer rounded-lg px-2 py-1 text-xs text-muted outline-none! transition-colors hover:bg-line hover:text-base-content focus-visible:shadow-focus"
            >
              Clear date
            </button>
          ) : (
            <span />
          )}
          <span className="hidden font-mono text-[10px] text-faint sm:inline">
            ←↑↓→ · PgUp/PgDn · ↵ · Esc
          </span>
        </div>
      </div>
    </>
  );
}
