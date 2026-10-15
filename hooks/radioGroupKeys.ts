/**
 * Which option a key press in a radiogroup moves to (#272), following the
 * WAI-ARIA radio group pattern: ArrowRight/ArrowDown → next, ArrowLeft/
 * ArrowUp → previous (both wrap around), Home/End → first/last. Returns
 * null for any other key, so the caller leaves the event alone. With
 * nothing checked (`current` -1), "next" starts at the first option and
 * "previous" at the last. Pure, no DOM.
 */
export function nextRadioIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  const last = count - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return current < 0 || current >= last ? 0 : current + 1;
    case "ArrowLeft":
    case "ArrowUp":
      return current <= 0 ? last : current - 1;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}
