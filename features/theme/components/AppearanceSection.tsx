"use client";

import { Monitor, Moon, SunDim, type LucideIcon } from "lucide-react";
import { writeThemePreference, type ThemePreference } from "@/features/theme/lib/themePreference";
import { useThemePreference } from "@/features/theme/hooks/useTheme";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: SunDim },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * "Appearance" on /settings (#266): System / Light / Dark as a sunken
 * segmented control, the same look as the status filter. It is a real
 * radiogroup: only the checked option is a tab stop, and the arrow keys
 * (plus Home/End) move the choice and the focus together (shared
 * `useRadioGroupKeys`, #272). The choice is
 * stored per device (localStorage), so it is not part of backups.
 */
export default function AppearanceSection() {
  const preference = useThemePreference();
  const radios = useRadioGroupKeys({
    count: OPTIONS.length,
    selectedIndex: OPTIONS.findIndex((option) => option.value === preference),
    onSelect: (index) => writeThemePreference(OPTIONS[index].value),
  });

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
        {...radios.groupProps}
        className="flex w-fit gap-0.5 rounded-xl surface-sunken p-1"
      >
        {OPTIONS.map((option, index) => {
          const active = preference === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              {...radios.itemProps(index)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => writeThemePreference(option.value)}
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
