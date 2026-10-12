"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { parseDateText } from "@/lib/utils/parseDate";
import { parseDateOnly } from "@/lib/utils/parseDateOnly";
import { toLocalDateKey } from "@/lib/utils/planDateOptions";
import { dayOffset, formatDateFieldValue, relativeDayLabel } from "@/lib/utils/dateField";
import { useDismiss } from "@/lib/ui/useDismiss";
import DatePopover from "@/components/date/DatePopover";

type DateFieldProps = {
  /** "YYYY-MM-DD", or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  /** Accessible name of the text field ("Due date"). */
  label: string;
  /** Allow clearing (typing nothing, or "Clear date" in the popover). */
  clearable?: boolean;
  /** Earliest allowed date ("YYYY-MM-DD"). */
  min?: string;
  /** Show past dates' hint in the error color ("4 days ago") — for due dates. */
  showLateHint?: boolean;
  placeholder?: string;
  className?: string;
  /** Focus the text field on mount (Plan for… → Pick a date). */
  autoFocus?: boolean;
  /** Line the popover up with the field's right edge, for fields near the right side of the screen. */
  popoverAlign?: "start" | "end";
};

type Preview =
  | { kind: "none" }
  | { kind: "date"; key: string }
  | { kind: "clear" }
  | { kind: "invalid"; message: string };

/**
 * A date field that never shows the browser-language format (#258): the
 * value reads "Fri 16 Oct 2026" (APP_LOCALE, mono) with a relative hint,
 * and replaces the native `<input type="date">`.
 *
 * Typing: focus selects the text; anything typed is read with the
 * quick-add date parser ("fri", "tomorrow", "12.10.", "übermorgen") and
 * previewed under the field. Enter or leaving the field applies it;
 * unreadable text shows an error line and keeps the old value, Escape
 * restores the text. Picking: the chevron opens DatePopover (quick picks,
 * month grid, keyboard). The value stays a "YYYY-MM-DD" string, so
 * storage doesn't change.
 */
export default function DateField({
  value,
  onChange,
  label,
  clearable = false,
  min,
  showLateHint = false,
  placeholder = "No date — type “fri” or “12.10.”",
  className = "",
  autoFocus = false,
  popoverAlign = "start",
}: DateFieldProps) {
  const display = value ? formatDateFieldValue(value) : "";
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  useDismiss(open, () => setOpen(false), [rootRef], toggleRef);

  const now = new Date();
  const text = draft ?? display;
  const preview = previewFor(draft, display, now, clearable, min);

  function commit(): boolean {
    if (preview.kind === "date") onChange(preview.key);
    if (preview.kind === "clear") onChange("");
    if (preview.kind === "invalid") return false;
    setDraft(null);
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && draft !== null && draft !== display) {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape" && draft !== null && draft !== display) {
      event.preventDefault();
      event.stopPropagation();
      setDraft(display);
      requestAnimationFrame(() => inputRef.current?.select());
    } else if (event.key === "ArrowDown" && event.altKey) {
      event.preventDefault();
      setOpen(true);
    }
  }

  function pick(key: string) {
    onChange(key);
    setDraft(null);
    setOpen(false);
    toggleRef.current?.focus();
  }

  const relative = value ? relativeDayLabel(value, now) : null;
  const late = showLateHint && value !== "" && dayOffset(parseDateOnly(value), now) < 0;
  const editing = draft !== null && draft !== display;

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onBlur={(event) => {
        // Tabbing out of the field or the popover closes it. A click on empty
        // space inside the popover blurs to nothing (relatedTarget null) and
        // must not close it; outside clicks are handled by useDismiss.
        const next = event.relatedTarget as Node | null;
        if (open && next && !rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <div
        className={`flex h-10 items-center gap-2 rounded-field border pr-1.5 pl-3 surface-sunken transition-shadow focus-within:shadow-focus ${
          preview.kind === "invalid"
            ? "border-error/70"
            : "border-transparent focus-within:border-accent/55"
        }`}
      >
        <CalendarDays
          size={16}
          strokeWidth={1.8}
          aria-hidden
          className={`shrink-0 ${value ? "text-accent" : "text-faint"}`}
        />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          value={text}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={editing ? hintId : undefined}
          aria-invalid={preview.kind === "invalid" || undefined}
          autoComplete="off"
          spellCheck={false}
          onFocus={(event) => {
            setDraft(display);
            event.currentTarget.select();
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (!commit()) setDraft(null);
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none! placeholder:text-faint"
        />
        {relative && !editing && (
          <span
            className={`shrink-0 font-mono text-meta whitespace-nowrap ${late ? "text-error" : "text-faint"}`}
          >
            {relative}
          </span>
        )}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((shown) => !shown)}
          aria-label={open ? "Close calendar" : "Open calendar"}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none! transition-colors focus-visible:shadow-focus ${
            open
              ? "bg-line-strong text-base-content"
              : "text-muted hover:bg-line-strong hover:text-base-content"
          }`}
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {editing && (
        <p
          id={hintId}
          aria-live="polite"
          className={`mt-1.5 px-0.5 font-mono text-meta ${
            preview.kind === "invalid" ? "text-error" : "text-subtle"
          }`}
        >
          {preview.kind === "date" && (
            <>
              → <span className="text-accent">{formatDateFieldValue(preview.key)}</span> ·{" "}
              {relativeDayLabel(preview.key, now)}
            </>
          )}
          {preview.kind === "clear" && "→ no date"}
          {preview.kind === "invalid" && preview.message}
        </p>
      )}

      {open && (
        <DatePopover
          value={value}
          min={min}
          clearable={clearable}
          align={popoverAlign}
          now={now}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function previewFor(
  draft: string | null,
  display: string,
  now: Date,
  clearable: boolean,
  min: string | undefined,
): Preview {
  if (draft === null || draft === display) return { kind: "none" };
  if (draft.trim() === "") {
    return clearable ? { kind: "clear" } : { kind: "invalid", message: "A date is needed here." };
  }
  const date = parseDateText(draft, now);
  if (!date) {
    return {
      kind: "invalid",
      message: "Couldn’t read that as a date — try “fri”, “tomorrow” or “12.10.”",
    };
  }
  const key = toLocalDateKey(date);
  if (min && key < min) return { kind: "invalid", message: "Pick today or a later day." };
  return { kind: "date", key };
}
