import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import AppNav from "@/components/layout/AppNav";
import BottomTabBar from "@/components/layout/BottomTabBar";
import AddTaskFab from "@/components/layout/AddTaskFab";
import { ToastProvider } from "@/components/layout/ToastProvider";
import TaskDrawer from "@/components/task/TaskDrawer";
import SeriesDrawer from "@/components/task/SeriesDrawer";
import OccurrenceSync from "@/components/task/OccurrenceSync";
import { TaskDrawerProvider } from "@/components/task/TaskDrawerProvider";
import { SeriesDrawerProvider } from "@/components/task/SeriesDrawerProvider";
import { CommandPaletteProvider } from "@/components/palette/CommandPaletteProvider";
import CommandPalette from "@/components/palette/CommandPalette";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MorgenMachIch",
  description: "A to-do app with labels, a calendar view, and recurring tasks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="morgen"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-base-100 text-base-content">
        <OccurrenceSync />
        <ToastProvider>
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
      </body>
    </html>
  );
}
