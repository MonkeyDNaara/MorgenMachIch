import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppNav from "@/app/(app)/_components/AppNav";
import BottomTabBar from "@/app/(app)/_components/BottomTabBar";
import AddTaskFab from "@/app/(app)/_components/AddTaskFab";
import { ToastProvider } from "@/components/ui/ToastProvider";
import TitleCount from "@/app/(app)/_components/TitleCount";
import UpdateToast from "@/features/pwa/components/UpdateToast";
import MarkAppVisited from "@/features/site/components/MarkAppVisited";
import TaskDrawer from "@/features/tasks/components/drawer/TaskDrawer";
import SeriesDrawer from "@/features/series/components/SeriesDrawer";
import OccurrenceSync from "@/features/series/components/OccurrenceSync";
import { TaskDrawerProvider } from "@/features/tasks/components/drawer/TaskDrawerProvider";
import { SeriesDrawerProvider } from "@/features/series/components/SeriesDrawerProvider";
import { CommandPaletteProvider } from "@/features/command-palette/components/CommandPaletteProvider";
import CommandPalette from "@/features/command-palette/components/CommandPalette";

// The app pages show nothing without local data — keep them out of search
// results (#377). They stay crawlable, so the noindex is seen.
export const metadata: Metadata = { robots: { index: false } };

/**
 * The app shell (#83, moved from the root layout): navigation, FAB,
 * drawers, command palette, toasts and everything that reads IndexedDB.
 * The route group `(app)` doesn't change any URL; it only keeps all of
 * this off the landing page.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarkAppVisited />
      <TitleCount />
      <OccurrenceSync />
      <ToastProvider>
        <UpdateToast />
        <TaskDrawerProvider>
          <SeriesDrawerProvider>
            <CommandPaletteProvider>
              <AppNav />
              {/* Below md the BottomTabBar is fixed to the bottom; this padding keeps
                the last content row from hiding behind it. */}
              <main className="min-w-0 flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
                {children}
              </main>
              <BottomTabBar />
              <AddTaskFab />
              <TaskDrawer />
              <SeriesDrawer />
              <CommandPalette />
            </CommandPaletteProvider>
          </SeriesDrawerProvider>
        </TaskDrawerProvider>
      </ToastProvider>
    </>
  );
}
