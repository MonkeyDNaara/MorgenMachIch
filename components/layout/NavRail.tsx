"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, LayoutList, Calendar, Tag, Settings, type LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/tasks", label: "Tasks", icon: LayoutList },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/labels", label: "Labels", icon: Tag },
];

const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navItemClasses(active: boolean): string {
  const base =
    "flex h-[34px] w-[34px] items-center justify-center rounded-xl transition-colors";
  return active
    ? `${base} bg-primary text-primary-content shadow-lg shadow-primary/30`
    : `${base} bg-base-300 text-base-content/60 shadow-inner shadow-black/40 hover:text-base-content`;
}

export default function NavRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="flex w-16 shrink-0 flex-col items-center gap-5 border-r border-white/5 bg-base-200 py-6"
    >
      <Link
        href="/today"
        aria-label="MorgenMachIch — go to Today"
        className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-primary font-mono text-sm font-bold text-primary-content shadow-lg shadow-primary/40"
      >
        m
      </Link>

      <ul className="flex flex-col items-center gap-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-label={label}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={navItemClasses(isActive(pathname, href))}
            >
              <Icon size={16} strokeWidth={1.8} />
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={SETTINGS_ITEM.href}
        aria-label={SETTINGS_ITEM.label}
        aria-current={isActive(pathname, SETTINGS_ITEM.href) ? "page" : undefined}
        className={`mt-auto ${navItemClasses(isActive(pathname, SETTINGS_ITEM.href))}`}
      >
        <SETTINGS_ITEM.icon size={16} strokeWidth={1.8} />
      </Link>
    </nav>
  );
}
