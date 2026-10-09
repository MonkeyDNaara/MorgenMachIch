/**
 * DaisyUI's default input focus (a colored border plus a separate 2px
 * outline offset from it) reads as two overlapping rings. This replaces
 * that with a single soft accent glow (the shared `shadow-focus` ring) by
 * driving daisyUI's own --input-color variable directly and swapping the
 * outline for a diffused shadow.
 *
 * Shared by every text input/textarea in the app (task drawer, labels
 * form) so the treatment lives in one place instead of being copied
 * per-component.
 */
export const FIELD_FOCUS =
  "bg-base-200 outline-none! [--input-color:var(--color-base-300)] " +
  "focus:[--input-color:var(--color-accent)]! " +
  "focus:shadow-focus!";
