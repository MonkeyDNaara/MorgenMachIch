/**
 * What Settings → App offers for installing (#82). Browsers differ:
 * Chromium hands out an install prompt (`beforeinstallprompt`), iOS only
 * installs via "Share → Add to Home Screen", Firefox desktop not at all.
 */
export type InstallState = "installed" | "prompt" | "ios-steps" | "unsupported";

export type InstallInput = {
  /** Running as the installed app (display-mode standalone / iOS home screen). */
  standalone: boolean;
  /** Installed from this tab just now (`appinstalled`); the tab stays a tab. */
  justInstalled: boolean;
  /** The browser handed us an install prompt we can show. */
  canPrompt: boolean;
  ios: boolean;
};

export function installState({
  standalone,
  justInstalled,
  canPrompt,
  ios,
}: InstallInput): InstallState {
  if (standalone || justInstalled) return "installed";
  if (canPrompt) return "prompt";
  if (ios) return "ios-steps";
  return "unsupported";
}

/** iPhone, iPod or iPad. iPadOS 13+ reports a Mac user agent, but unlike a
 * real Mac it has a touch screen. Every iOS browser can add to the home
 * screen via the share menu (Safari always, others since iOS 16.4). */
export function isIOSDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** Background update checks for a long-open app: when it comes back into
 * view, at most once per interval. */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function shouldCheckForUpdate(lastCheck: number, now: number): boolean {
  return now - lastCheck >= UPDATE_CHECK_INTERVAL_MS;
}
