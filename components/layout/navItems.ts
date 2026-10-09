import {
  Calendar,
  LayoutList,
  Settings,
  Sun,
  Tag,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for the app's navigation (#235), read by the
 * sidebar/rail (AppNav) and the mobile tab bar (BottomTabBar).
 */
export const NAV_ITEMS = {
  today: { href: "/today", label: "Today", icon: Sun },
  tasks: { href: "/tasks", label: "Tasks", icon: LayoutList },
  calendar: { href: "/calendar", label: "Calendar", icon: Calendar },
  labels: { href: "/labels", label: "Labels", icon: Tag },
  stats: { href: "/stats", label: "Stats", icon: TrendingUp },
  settings: { href: "/settings", label: "Settings", icon: Settings },
} satisfies Record<string, NavItem>;

/** Main entries in sidebar order; Settings sits apart at the bottom. */
export const MAIN_NAV: NavItem[] = [
  NAV_ITEMS.today,
  NAV_ITEMS.tasks,
  NAV_ITEMS.calendar,
  NAV_ITEMS.labels,
  NAV_ITEMS.stats,
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
