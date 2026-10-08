/**
 * What a command may do. Commands get these as plain functions instead of
 * importing the router or React contexts themselves, so the registry
 * stays framework-free data: the palette supplies the browser versions
 * today, and a future caller (natural-language quick-add, a second-brain
 * API) can supply its own.
 */
export type CommandContext = {
  navigate: (path: string) => void;
  openNewTask: () => void;
};

/** A user-facing command, as plain data (#196). */
export type Command = {
  id: string;
  label: string;
  /** Palette heading it is listed under: "Pages", "Actions", … */
  group: string;
  /** Other words that should find it ("add" → New task); never displayed. */
  keywords: string[];
  /** Short mono text shown next to it, e.g. the route. */
  hint?: string;
  run: (context: CommandContext) => void;
};
