import { createStoredFlag } from "@/lib/storage/storedFlag";

/**
 * "This browser has used the app before" (#83). Set by the app layout;
 * read on `/` to send returning users straight to /today instead of the
 * landing page. Per browser, not part of backups.
 */
export const APP_VISITED_KEY = "morgenmachich:visited";
export const appVisited = createStoredFlag(APP_VISITED_KEY, false);

/** `/?landing` shows the landing page even to returning users. */
export const LANDING_PARAM = "landing";

export function shouldSkipLanding(pathname: string, search: string, visited: boolean): boolean {
  return pathname === "/" && visited && !new URLSearchParams(search).has(LANDING_PARAM);
}

/**
 * Runs in the root layout's <head> before the first paint (next to
 * THEME_INIT_SCRIPT), so a returning user never sees the landing page
 * flash. It lives in the root layout because React doesn't run inline
 * scripts rendered by a page during client-side navigation. Same rule as
 * `shouldSkipLanding`, which the tests compare it against.
 */
export const SKIP_LANDING_SCRIPT = `(function(){try{if(location.pathname==="/"&&localStorage.getItem(${JSON.stringify(
  APP_VISITED_KEY,
)})==="1"&&!new URLSearchParams(location.search).has(${JSON.stringify(
  LANDING_PARAM,
)}))location.replace("/today")}catch(e){}})()`;
