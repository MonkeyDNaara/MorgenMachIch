"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Search } from "lucide-react";
import { useCommandPalette } from "@/components/palette/CommandPaletteProvider";
import { NAV_ITEMS, isActive, type NavItem } from "@/components/layout/navItems";

const TABS: NavItem[] = [NAV_ITEMS.today, NAV_ITEMS.tasks, NAV_ITEMS.calendar, NAV_ITEMS.stats];
const MORE_ITEMS: NavItem[] = [NAV_ITEMS.labels, NAV_ITEMS.settings];

const tabClasses =
  "flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[11px] outline-none! transition-colors focus-visible:shadow-focus";

const menuItemClasses =
  "flex w-full cursor-pointer items-center gap-3 rounded-field px-3 py-2.5 text-left text-sm outline-none! transition-colors hover:bg-line focus-visible:bg-line";

/**
 * Mobile navigation below md (#235): a bar fixed to the bottom with
 * Today, Tasks, Calendar, Stats and More. More opens a small menu above
 * the bar with Labels, Search and Settings — plain React state like
 * PlanForMenu (Escape or an outside click closes it, focus returns to
 * the More button). More counts as active on /labels and /settings.
 */
export default function BottomTabBar() {
  const pathname = usePathname();
  const { openPalette } = useCommandPalette();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreActive = MORE_ITEMS.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || moreRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      moreRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 bg-base-200 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--color-line),0_-6px_16px_rgb(0_0_0/0.35)] md:hidden"
    >
      {menuOpen && (
        <div
          ref={menuRef}
          id="more-menu"
          className="absolute right-2 bottom-full mb-2 w-48 rounded-box border border-line-strong bg-base-300 p-1 shadow-overlay"
        >
          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={menuItemClasses}
            >
              <item.icon size={16} strokeWidth={1.8} />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openPalette();
            }}
            className={menuItemClasses}
          >
            <Search size={16} strokeWidth={1.8} />
            Search
          </button>
        </div>
      )}

      <ul className="flex items-stretch gap-1">
        {TABS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${tabClasses} ${active ? "text-base-content" : "text-base-content/50"}`}
              >
                <item.icon
                  size={20}
                  strokeWidth={1.8}
                  className={active ? "text-primary" : undefined}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button
            ref={moreRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="more-menu"
            className={`${tabClasses} ${moreActive || menuOpen ? "text-base-content" : "text-base-content/50"}`}
          >
            <Ellipsis
              size={20}
              strokeWidth={1.8}
              className={moreActive ? "text-primary" : undefined}
            />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
