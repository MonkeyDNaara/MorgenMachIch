/** Where the app runs when nothing else is configured (render.yaml). */
export const DEFAULT_SITE_URL = "https://morgen-mach-ich.onrender.com";

/**
 * The public base URL (#377) for metadataBase, canonical links, the
 * sitemap and robots.txt — link previews need absolute URLs. Set
 * NEXT_PUBLIC_SITE_URL for another domain; it is read at build time.
 * An empty, invalid or non-http(s) value falls back to the Render URL.
 */
export function resolveSiteUrl(value: string | undefined): URL {
  try {
    const url = new URL(value?.trim() || DEFAULT_SITE_URL);
    if (url.protocol === "http:" || url.protocol === "https:") return new URL(url.origin);
  } catch {
    // Not a URL — use the default below.
  }
  return new URL(DEFAULT_SITE_URL);
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
