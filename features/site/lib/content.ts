import {
  Braces,
  CalendarDays,
  CodeXml,
  Cog,
  ChartNoAxesColumn,
  Command,
  Download,
  HardDriveDownload,
  Repeat,
  SunMoon,
  Sunrise,
  Tag,
  Wrench,
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
  github: "https://github.com/MonkeyDNaara",
  linkedin: "https://www.linkedin.com/in/niko-klam/",
} as const;

/** Title and description for search results and link previews (#377). */
export const SEO = {
  siteName: "MorgenMachIch",
  title: "MorgenMachIch — a to-do app for today and Morgen",
  description:
    "A to-do app with a calendar, repeating routines and a quick-add that understands “Call mom fri 3pm”. Installable, works offline, your data stays in your browser.",
};

/** Anchor links in the site header. */
export const SITE_NAV: { href: string; label: string }[] = [
  { href: "#features", label: "Features" },
  { href: "#built", label: "How it's built" },
  { href: "#about", label: "About me" },
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

export const QUICK_ADD_DEMO = {
  eyebrow: "Try it here",
  title: "Type it the way you'd say it.",
  text: "This is the app's real quick-add parser, English and German. Dates, times, repeats, labels and priority are picked out while you type — click a chip to ignore it. Nothing is saved.",
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

// --- Screenshots (#376) --------------------------------------------------------

/** Where the screenshots live; `npm run screenshots` writes `{id}-{theme}.webp`. */
export const SCREENS_PATH = "/site/screens";

/** Address shown in the drawn browser frames around the screenshots. */
export const FRAME_HOST = "morgenmachich.de";

export const SCREENSHOTS = {
  eyebrow: "Screenshots",
  title: "Same calm, day or night.",
  text: "Real screenshots of the app with the sample data, in both themes — recreated by a script whenever the design changes.",
  views: [
    {
      id: "today",
      label: "Today",
      text: "Overdue first, then today in order — with a day-progress bar and your streak.",
    },
    {
      id: "tasks",
      label: "Tasks",
      text: "Open tasks by due date, your routines, and a backlog you sort by hand.",
    },
    {
      id: "calendar",
      label: "Calendar",
      text: "The month at a glance — repeats included, drag a task to another day.",
    },
    {
      id: "stats",
      label: "Stats",
      text: "Streaks, a year of activity, tasks per day and per label, on-time rate.",
    },
  ],
} as const;

export const FINAL_CTA = { title: "Ready when you are. Or Morgen." };

// --- How it's built (#375) ---------------------------------------------------

export const BUILD = {
  eyebrow: "How it's built",
  title: "Planned like a team project. Built with AI, one issue at a time.",
  text: "Every feature started as an epic with issues, got its own branch and pull request, and passed type checks, lint, a build and tests in four time zones before it was merged.",
};

/** Each tool with the reason it was chosen — not just a logo wall. */
export const STACK: { name: string; why: string }[] = [
  {
    name: "Next.js + React",
    why: "App Router, one route per view, server components for static parts.",
  },
  {
    name: "TypeScript + Zod",
    why: "One schema per entity: types at compile time, validation at the storage boundary.",
  },
  {
    name: "Dexie (IndexedDB)",
    why: "Local-first. Only lib/db talks to storage, so a hosted API can replace it.",
  },
  {
    name: "Tailwind + DaisyUI",
    why: "Two themes built on semantic tokens, no hard-coded colours.",
  },
  { name: "chrono-node", why: "Natural-language dates in quick-add, English and German." },
  { name: "dnd-kit", why: "Drag & drop with keyboard and touch support built in." },
  { name: "Service worker", why: "Hand-written: offline app shell and an update toast." },
  {
    name: "Vitest + GitHub Actions",
    why: "Tests next to the code, CI on every pull request, deploys on Render.",
  },
];

export const DECISIONS: { tag: string; title: string; text: string }[] = [
  {
    tag: "Build vs. buy",
    title: "Hand-built where it's small, a library where it's hard",
    text: "Command palette, charts and service worker are own code; drag & drop uses dnd-kit, because touch, collisions and keyboard dragging are the hard part.",
  },
  {
    tag: "Ordering",
    title: "Fractional indexing",
    text: "Moving a task writes one short key between its neighbours instead of renumbering the list — ready for a database later.",
  },
  {
    tag: "Testing",
    title: "Four time zones",
    text: "Most of the logic is calendar-day math, so every test runs in Berlin, Los Angeles, Kolkata and Auckland.",
  },
];

// --- Built by (#375) ---------------------------------------------------------

export const PROFILE = {
  name: "Niko Klam",
  photo: "/site/niko.webp",
  role: "Junior Software Developer in training · Full-Stack / Back-End",
  badge: "Open to remote junior roles",
  location: "Remote-first · on site around Neustrelitz possible",
  about:
    "Transitioning from automation and mechanical engineering to full-stack and back-end development. Python, React, TypeScript and C# — and I love coding. This app is my proof: planned like a team project, built step by step with AI, tested and shipped.",
};

export const CAREER: { years: string; title: string; text: string; current?: boolean }[] = [
  {
    years: "2012–22",
    title: "BMW AG · production",
    text: "Industrial mechanic → shift leader in crankshaft production, leading 10+ people · state-certified technician (mech. engineering)",
  },
  {
    years: "2022–23",
    title: "BMW AG · maintenance & IT",
    text: "Programmed visualisations of machines, production and databases",
  },
  {
    years: "2023–25",
    title: "Automation technician",
    text: "OLKO Maschinentechnik · Siemens TIA Portal projects, on-site commissioning, functional safety",
  },
  {
    years: "2026–27",
    title: "Software Engineering & AI",
    text: "WBS Coding School · computer science, front-end, back-end & AI",
    current: true,
  },
];

/** `usedHere`: part of MorgenMachIch — marked with the accent dot. */
export const SKILL_GROUPS: {
  name: string;
  icon: LucideIcon;
  skills: { name: string; usedHere?: boolean }[];
}[] = [
  {
    name: "Languages",
    icon: Braces,
    skills: [
      { name: "Python" },
      { name: "TypeScript", usedHere: true },
      { name: "JavaScript", usedHere: true },
      { name: "C#" },
      { name: "SQL" },
    ],
  },
  {
    name: "Web & back-end",
    icon: CodeXml,
    skills: [
      { name: "React", usedHere: true },
      { name: "Next.js", usedHere: true },
      { name: "HTML & CSS", usedHere: true },
      { name: "Tailwind", usedHere: true },
      { name: "Flask" },
      { name: "ASP.NET" },
      { name: "REST APIs" },
      { name: "PostgreSQL" },
      { name: "MongoDB" },
    ],
  },
  {
    name: "Tools & practice",
    icon: Wrench,
    skills: [
      { name: "Git & GitHub", usedHere: true },
      { name: "Testing & debugging", usedHere: true },
      { name: "Data structures & algorithms" },
      { name: "Docker" },
      { name: "Azure" },
      { name: "Generative & agentic AI", usedHere: true },
      { name: "Scrum / agile" },
      { name: "Jira" },
    ],
  },
  {
    name: "From automation",
    icon: Cog,
    skills: [
      { name: "Siemens S7 / TIA Portal" },
      { name: "Functional safety · EN 62061" },
      { name: "HMI visualisation" },
      { name: "SAP" },
    ],
  },
];

export const CERTIFICATES: { name: string; note: string; done: boolean }[] = [
  { name: "PCEP", note: "Python Institute", done: true },
  { name: "PCAP", note: "in progress", done: false },
  { name: "AZ-900", note: "in progress", done: false },
];
