import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept in sync with the window (#355).
 * `useSyncExternalStore` makes it hydration-safe: the server (and the first
 * client render) use `serverValue`, then it follows `matchMedia`.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tailwind's `md` breakpoint and up. */
export const MD_UP = "(min-width: 48rem)";
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
