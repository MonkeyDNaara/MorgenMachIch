import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/features/theme/lib/themePreference";

// Served at /manifest.webmanifest; Next adds the <link rel="manifest"> itself (#80).
// Icons come from `npm run icons` (scripts/generate-icons.mjs).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/today",
    name: "MorgenMachIch",
    short_name: "Morgen",
    description: "A to-do app with labels, a calendar view, and recurring tasks.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLORS.dark,
    theme_color: THEME_COLORS.dark,
    categories: ["productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "New task",
        url: "/today?new=1",
        icons: [
          {
            src: "/icons/shortcut-new-96.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Today",
        url: "/today",
        icons: [
          {
            src: "/icons/shortcut-today-96.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Calendar",
        url: "/calendar",
        icons: [
          {
            src: "/icons/shortcut-calendar-96.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
