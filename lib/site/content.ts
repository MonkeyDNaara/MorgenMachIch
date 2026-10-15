import {
  CalendarDays,
  ChartNoAxesColumn,
  Command,
  Download,
  HardDriveDownload,
  Repeat,
  SunMoon,
  Sunrise,
  Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * Copy and links of the public landing page (#85), kept out of the
 * components so the wording lives in one place.
 */
export const SITE_LINKS = {
  app: "/today",
  sampleData: "/today?sample=1",
  repo: "https://github.com/MonkeyDNaara/MorgenMachIch",
} as const;

/** Anchor links in the site header; "How it's built" and "About me" follow with #375. */
export const SITE_NAV: { href: string; label: string }[] = [
  { href: "#features", label: "Features" },
];

export const HERO = {
  eyebrow: "A to-do app for today — and Morgen",
  titleStart: "Today, sorted.",
  titleEnd: "The rest can wait for",
  titleBrand: "Morgen.",
  lead: "Tasks, a calendar, routines that repeat on their own and a quick-add that understands “Call mom fri 3pm”. Fast, installable, and your data stays in your browser.",
  sampleCta: "Try it with sample data",
  appCta: "Open the app",
  note: "No sign-up · sample data only fills an empty app · works offline",
};

export type Feature = { icon: LucideIcon; title: string; text: string };

export const FEATURES: Feature[] = [
  {
    icon: Sunrise,
    title: "Today & Coming up",
    text: "What's due and overdue, a day-progress bar and the week ahead — drag a task onto another day.",
  },
  {
    icon: CalendarDays,
    title: "Calendar",
    text: "Every due date in a month view, a backlog tray to plan undated tasks, drag & drop to reschedule.",
  },
  {
    icon: Repeat,
    title: "Routines that repeat",
    text: "“Every mon and thu 6pm” — each occurrence can be done or skipped on its own.",
  },
  {
    icon: Tag,
    title: "Labels & filters",
    text: "Colour labels, priorities and status filters on the list and the calendar.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Stats & streaks",
    text: "Your current and best streak, a year heatmap and how much you finish on time.",
  },
  {
    icon: Command,
    title: "Keyboard first",
    text: "A command palette (⌘K), shortcuts and full keyboard support in every control.",
  },
  {
    icon: Download,
    title: "Install it",
    text: "Opens like a native app, works offline and shows today's count on its icon.",
  },
  {
    icon: SunMoon,
    title: "Light & dark",
    text: "Two hand-tuned themes that follow your device — or your choice.",
  },
  {
    icon: HardDriveDownload,
    title: "Your data, your file",
    text: "Everything stays in your browser. Export a backup any time, import it anywhere.",
  },
];

export const FINAL_CTA = { title: "Ready when you are. Or Morgen." };
