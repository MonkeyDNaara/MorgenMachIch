/**
 * Fill of the loading bar after `seconds` of waiting (#467): it eases towards 90 % and never
 * reaches 100 %, because the agent's answer time is unknown (5–60 s). Done is the content itself.
 */
export function loadingProgress(seconds: number): number {
  return 90 * (1 - Math.exp(-Math.max(0, seconds) / 18));
}

/** Cancel appears after this many seconds of waiting. */
export const CANCEL_AFTER_SECONDS = 15;
