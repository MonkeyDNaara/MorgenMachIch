"use client";

import { useRef, type KeyboardEvent } from "react";
import { Monitor, Moon, SunDim, type LucideIcon } from "lucide-react";
import { writeThemePreference, type ThemePreference } from "@/lib/ui/themePreference";
import { useThemePreference } from "@/lib/ui/useTheme";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: SunDim },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * "Appearance" on /settings (#266): System / Light / Dark as a sunken
 * segmented control, the same look as the status filter. It is a real
 * radiogroup: only the checked option is a tab stop, and the arrow keys
 * (plus Home/End) move the choice and the focus together. The choice is
 * stored per device (localStorage), so it is not part of backups.
 */
export default function AppearanceSection() {
  const preference = useThemePreference();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function choose(index: number) {
    writeThemePreference(OPTIONS[index].value);
    buttons.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = OPTIONS.findIndex((option) => option.value === preference);
    const last = OPTIONS.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? current === last
          ? 0
          : current + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? current === 0
            ? last
            : current - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    choose(next);
  }

  return (
    <section className="flex flex-col gap-4 surface-panel p-4">
      <div className="flex flex-col gap-1">
        <h2 id="appearance-heading" className="font-mono text-eyebrow text-muted uppercase">
          Appearance
        </h2>
        <p className="text-xs text-subtle">
          System follows your device. Stored in this browser only, not in backups.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="appearance-heading"
        onKeyDown={handleKeyDown}
        className="flex w-fit gap-0.5 rounded-xl surface-sunken p-1"
      >
        {OPTIONS.map((option, index) => {
          const active = preference === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => choose(index)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm outline-none! transition-colors focus-visible:shadow-focus ${
                active
                  ? "bg-base-300 text-base-content shadow-raised-sm"
                  : "text-muted hover:text-base-content"
              }`}
            >
              <Icon size={14} strokeWidth={1.8} aria-hidden />
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
