import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/features/pwa/components/ServiceWorkerRegistrar";
import ThemeSync from "@/features/theme/components/ThemeSync";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/features/theme/lib/themePreference";
import { SKIP_LANDING_SCRIPT } from "@/features/site/lib/appVisited";
import { BRIEFING_INIT_SCRIPT } from "@/features/dashboard/lib/briefingCollapsed";
import { SEO } from "@/features/site/lib/content";
import { SITE_URL } from "@/features/site/lib/siteUrl";
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
  description: SEO.description,
  // Absolute URLs for link previews, canonical links and the sitemap (#377).
  metadataBase: SITE_URL,
  openGraph: { type: "website", siteName: SEO.siteName, locale: "en_US" },
  twitter: { card: "summary_large_image" },
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
        {/* Sends returning users from / to /today before anything is painted (#83). */}
        <script dangerouslySetInnerHTML={{ __html: SKIP_LANDING_SCRIPT }} />
        {/* Keeps a collapsed /today briefing collapsed before the first paint (#421). */}
        <script dangerouslySetInnerHTML={{ __html: BRIEFING_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex bg-base-100 text-base-content">
        {/* Only what every page needs; the app shell lives in app/(app)/layout.tsx and
          the landing page in app/(site)/ (#83). */}
        <ThemeSync />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
