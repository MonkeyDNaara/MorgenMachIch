import type { Label } from "@/lib/types";

/**
 * Fixed data for the landing page's quick-add demo (#86): the parser gets
 * these labels instead of the database, so the demo never touches
 * IndexedDB and works the same for every visitor.
 */
export const DEMO_LABELS: Label[] = [
  { id: "demo-family", name: "Family", color: "#a5a0ff", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "demo-health", name: "Health", color: "#7cc36c", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "demo-work", name: "Work", color: "#6eb0ff", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "demo-home", name: "Home", color: "#e69c3a", createdAt: "2026-01-01T00:00:00.000Z" },
];

/** The first one pre-fills the field; all of them are one-click examples. */
export const DEMO_EXAMPLES = [
  "Call mom fri 3pm #family !high",
  "Gym every mon and thu 6pm #health",
  "Miete monatlich am 1. #home !high",
  "Dentist tomorrow 9:30 !medium",
];
