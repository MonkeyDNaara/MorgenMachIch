import { createStoredFlag } from "@/lib/storage/storedFlag";

export const BRIEFING_COLLAPSED_KEY = "morgenmachich:briefing-collapsed";

/** Attribute on <html> that the `briefing-collapsed` CSS variant reads (globals.css). */
export const BRIEFING_ATTRIBUTE = "data-briefing";

/**
 * Whether the /today briefing band is collapsed (#421) — desktop only, per
 * device, default expanded. Like the theme (#266), the visible state comes
 * from an attribute on <html> that BRIEFING_INIT_SCRIPT sets before the
 * first paint, so a collapsed band never flashes open and React renders
 * the same markup on server and client.
 */
export const briefingCollapsed = createStoredFlag(BRIEFING_COLLAPSED_KEY, false);

export function applyBriefingCollapsed(
  collapsed: boolean,
  root: HTMLElement = document.documentElement,
): void {
  if (collapsed) root.setAttribute(BRIEFING_ATTRIBUTE, "collapsed");
  else root.removeAttribute(BRIEFING_ATTRIBUTE);
}

/** Shows the change right away and remembers it for the next visit. */
export function setBriefingCollapsed(collapsed: boolean): void {
  applyBriefingCollapsed(collapsed);
  briefingCollapsed.write(collapsed);
}

/** Inline head script: applies a stored "collapsed" before the first paint. */
export const BRIEFING_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  BRIEFING_COLLAPSED_KEY,
)})==="1")document.documentElement.setAttribute(${JSON.stringify(
  BRIEFING_ATTRIBUTE,
)},"collapsed")}catch(e){}})()`;
