export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "morgenmachich:theme";
const CHANGE_EVENT = "morgenmachich:theme-changed";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** DaisyUI theme names in app/globals.css (#265). */
export const THEME_NAMES: Record<ResolvedTheme, string> = {
  light: "morgen-light",
  dark: "morgen",
};

/** Page background per theme, for the mobile browser bar (<meta name="theme-color">). */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f6f2ec",
  dark: "#0b1214",
};

function isPreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * The theme choice (#266), kept in localStorage: it must be readable
 * before the first paint (see THEME_INIT_SCRIPT), so it can't live in
 * IndexedDB, and it is a per-device preference, so it is not part of
 * backups. Defaults to "system". Shaped for useSyncExternalStore like
 * backlogVisible.ts; every storage access is wrapped in try/catch.
 */
export function readThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isPreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage unavailable — the theme still switches until reload.
  }
  applyThemePreference(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeThemePreference(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** The theme actually shown: the explicit choice, or the OS setting for "system". */
export function readResolvedTheme(): ResolvedTheme {
  const preference = readThemePreference();
  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Like subscribeThemePreference, plus OS changes (they matter while on "system"). */
export function subscribeResolvedTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const unsubscribe = subscribeThemePreference(onChange);
  media.addEventListener("change", onChange);
  return () => {
    unsubscribe();
    media.removeEventListener("change", onChange);
  };
}

/**
 * Puts a preference on the page. "system" removes `data-theme`, so the
 * CSS follows prefers-color-scheme by itself (morgen is `prefersdark`);
 * light/dark set the DaisyUI theme name. The theme-color metas follow:
 * the chosen color for an explicit theme, each meta's own scheme for
 * "system". Keep in sync with THEME_INIT_SCRIPT below.
 */
export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", THEME_NAMES[preference]);

  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const scheme: ResolvedTheme =
      preference !== "system" ? preference : meta.media.includes("dark") ? "dark" : "light";
    meta.content = THEME_COLORS[scheme];
  });
}

/**
 * Inline script for <head> (#266): applies a stored light/dark choice
 * before the first paint, so a light choice never flashes dark (and the
 * other way round). It runs before React, so it can't import anything —
 * the same logic as applyThemePreference for the explicit case, built
 * from the constants above. "system" needs nothing: no attribute is the
 * default.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});var n=${JSON.stringify(THEME_NAMES)};var c=${JSON.stringify(
  THEME_COLORS,
)};if(p!=="light"&&p!=="dark")return;document.documentElement.setAttribute("data-theme",n[p]);document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=c[p]})}catch(e){}})()`;
