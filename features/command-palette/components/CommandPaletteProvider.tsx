"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CommandPaletteContextValue = {
  isOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/**
 * Owns whether the command palette is open (#195), as its own context
 * like the task drawer's — the nav rail button and the keyboard shortcut
 * both open it without prop-drilling. Also installs the global
 * Cmd+K / Ctrl+K listener, which toggles the palette on every route and
 * works even while typing in a field (that is the point of a palette
 * shortcut), so it prevents the browser's own Cmd/Ctrl+K handling.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(
    () => ({ isOpen, openPalette, closePalette }),
    [isOpen, openPalette, closePalette],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return context;
}
