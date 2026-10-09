"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Search } from "lucide-react";
import { getTasks } from "@/lib/db/tasks";
import { isTodayOrOverdue } from "@/lib/utils/isDueToday";
import { useModKey } from "@/lib/ui/useModKey";
import { useCommandPalette } from "@/components/palette/CommandPaletteProvider";
import LogoMark from "@/components/layout/LogoMark";
import { MAIN_NAV, NAV_ITEMS, isActive, type NavItem } from "@/components/layout/navItems";

function itemClasses(active: boolean): string {
  const base =
    "flex h-10 w-10 items-center justify-center gap-3 rounded-xl text-sm outline-none! transition-colors focus-visible:shadow-focus lg:w-full lg:justify-start lg:px-3";
  return active
    ? `${base} bg-base-300 text-base-content shadow-raised-sm`
    : `${base} text-base-content/60 hover:bg-line hover:text-base-content`;
}

function NavLink({ item, active, count }: { item: NavItem; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={itemClasses(active)}
    >
      <Icon size={18} strokeWidth={1.8} className={active ? "shrink-0 text-primary" : "shrink-0"} />
      <span className="hidden flex-1 lg:inline">{item.label}</span>
      {count !== undefined && count > 0 && (
        <span className="hidden font-mono text-meta text-base-content/50 lg:inline">{count}</span>
      )}
    </Link>
  );
}

/**
 * App navigation from md up (#235): a 64 px icon rail at md that grows
 * into a text sidebar at lg — the same markup, labels are just hidden
 * below lg. Below md the BottomTabBar takes over. The Today entry shows
 * how many open tasks are due today or overdue.
 */
export default function AppNav() {
  const pathname = usePathname();
  const { openPalette } = useCommandPalette();
  const modKey = useModKey();
  const todayCount = useLiveQuery(
    async () =>
      (await getTasks()).filter((task) => task.status === "open" && isTodayOrOverdue(task)).length,
    [],
  );

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col items-center gap-1 bg-base-200 px-3 py-5 shadow-[inset_-1px_0_0_var(--color-line)] md:flex lg:w-56 lg:items-stretch"
    >
      <Link
        href="/today"
        aria-label="MorgenMachIch — go to Today"
        className="mb-6 flex items-center gap-2.5 rounded-xl outline-none! focus-visible:shadow-focus lg:px-1"
      >
        <LogoMark />
        <span className="hidden text-base font-bold tracking-tight lg:inline">
          <span className="text-primary">Morgen</span>MachIch
        </span>
      </Link>

      <ul className="flex flex-col items-center gap-1 lg:items-stretch">
        {MAIN_NAV.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              active={isActive(pathname, item.href)}
              count={item === NAV_ITEMS.today ? todayCount : undefined}
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col items-center gap-2 lg:items-stretch">
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search"
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          title={`Search — ${modKey}K`}
          className="flex h-10 w-10 cursor-pointer items-center justify-center gap-2.5 rounded-xl text-sm text-base-content/50 outline-none! surface-sunken transition-colors hover:text-base-content focus-visible:shadow-focus lg:w-full lg:justify-start lg:px-3"
        >
          <Search size={16} strokeWidth={1.8} className="shrink-0" />
          <span className="hidden flex-1 text-left lg:inline">Search</span>
          <kbd className="hidden font-mono text-meta lg:inline">{modKey}K</kbd>
        </button>
        <NavLink item={NAV_ITEMS.settings} active={isActive(pathname, NAV_ITEMS.settings.href)} />
      </div>
    </nav>
  );
}
