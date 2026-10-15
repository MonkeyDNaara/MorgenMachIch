"use client";

import { Moon, SunDim, SunMoon } from "lucide-react";
import { useResolvedTheme } from "@/features/theme/hooks/useTheme";

type ThemeToggleProps = {
  /** Called after switching, e.g. to close the mobile More menu. */
  onToggle?: () => void;
  /** Classes for the button; the nav rail and the More menu style it differently. */
  className: string;
  /** Show the text label only from lg up (nav rail) instead of always (menu). */
  labelFromLg?: boolean;
};

/**
 * Quick light/dark switch in the navigation (#266). It flips to the
 * opposite of the theme on screen and stores that as an explicit choice;
 * "System" is only offered in Settings → Appearance and the palette. The
 * icon shows the target (SunDim, not the Today sun), and until hydration
 * — when the theme on screen isn't known yet — a neutral SunMoon.
 */
export default function ThemeToggle({
  onToggle,
  className,
  labelFromLg = false,
}: ThemeToggleProps) {
  const { theme, toggle } = useResolvedTheme();
  const target = theme === "dark" ? "light" : "dark";
  const Icon = theme === null ? SunMoon : target === "light" ? SunDim : Moon;
  const label = target === "light" ? "Light theme" : "Dark theme";

  return (
    <button
      type="button"
      onClick={() => {
        toggle();
        onToggle?.();
      }}
      aria-label={`Switch to ${target} theme`}
      title={`Switch to ${target} theme`}
      className={className}
    >
      <Icon size={labelFromLg ? 18 : 16} strokeWidth={1.8} className="shrink-0" />
      <span className={labelFromLg ? "hidden flex-1 text-left lg:inline" : undefined}>{label}</span>
    </button>
  );
}
