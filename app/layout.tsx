import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import AppNav from "@/components/layout/AppNav";
import BottomTabBar from "@/components/layout/BottomTabBar";
import AddTaskFab from "@/components/layout/AddTaskFab";
import { ToastProvider } from "@/components/layout/ToastProvider";
import TitleCount from "@/components/layout/TitleCount";
import ServiceWorkerRegistrar from "@/components/layout/ServiceWorkerRegistrar";
import TaskDrawer from "@/components/task/TaskDrawer";
import SeriesDrawer from "@/components/task/SeriesDrawer";
import OccurrenceSync from "@/components/task/OccurrenceSync";
import ThemeSync from "@/components/layout/ThemeSync";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/ui/themePreference";
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
  // Pages set only their own name ("Today"); TitleCount adds the open count (#187).
  title: { default: "MorgenMachIch", template: "%s · MorgenMachIch" },
  description: "A to-do app with labels, a calendar view, and recurring tasks.",
  // iOS "Add to Home Screen": standalone launch with the short name (#80). The
  // default status bar keeps content below it, so only the bottom inset matters.
  appleWebApp: { capable: true, title: "Morgen", statusBarStyle: "default" },
};

// Mobile browser bar per OS scheme; an explicit theme choice overrides both (#266).
// viewportFit "cover" makes env(safe-area-inset-*) non-zero on notched phones,
// so the tab bar, FAB and toasts clear the home indicator (#80).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the head script may set data-theme before React hydrates (#266).
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies a stored light/dark choice before the first paint (#266). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex bg-base-100 text-base-content">
        <ThemeSync />
        <TitleCount />
        <ServiceWorkerRegistrar />
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
