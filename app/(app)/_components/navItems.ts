import {
  Calendar,
  GraduationCap,
  Info,
  LayoutDashboard,
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
  dashboard: { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  today: { href: "/today", label: "Today", icon: Sun },
  tasks: { href: "/tasks", label: "Tasks", icon: LayoutList },
  calendar: { href: "/calendar", label: "Calendar", icon: Calendar },
  labels: { href: "/labels", label: "Labels", icon: Tag },
  stats: { href: "/stats", label: "Stats", icon: TrendingUp },
  // Owner only (#469): the layout decides on the server whether it is listed.
  learn: { href: "/learn", label: "Learn", icon: GraduationCap },
  settings: { href: "/settings", label: "Settings", icon: Settings },
  // The landing page with the project story, the developer and the Impressum (#83).
  // `?landing` keeps returning users from being sent back to /dashboard.
  about: { href: "/?landing", label: "About", icon: Info },
} satisfies Record<string, NavItem>;

/** Main entries in sidebar order; About and Settings sit apart at the bottom. */
export const MAIN_NAV: NavItem[] = [
  NAV_ITEMS.dashboard,
  NAV_ITEMS.today,
  NAV_ITEMS.tasks,
  NAV_ITEMS.calendar,
  NAV_ITEMS.labels,
  NAV_ITEMS.stats,
];

/** The sidebar entries; Learn sits directly under Stats and only for the learning owner (#469). */
export function mainNav(showLearn: boolean): NavItem[] {
  return showLearn ? [...MAIN_NAV, NAV_ITEMS.learn] : MAIN_NAV;
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
