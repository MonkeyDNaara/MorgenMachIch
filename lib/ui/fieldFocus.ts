/**
 * DaisyUI's default input focus (a colored border plus a separate 2px
 * outline offset from it) reads as two overlapping rings. This replaces
 * that with a single soft cyan glow — the same treatment as the FAB's
 * shadow — by driving daisyUI's own --input-color variable directly and
 * swapping the outline for a diffused shadow.
 *
 * Shared by every text input/textarea in the app (task drawer, labels
 * form) so the treatment lives in one place instead of being copied
 * per-component.
 */
export const FIELD_FOCUS =
  "bg-base-200 outline-none! [--input-color:var(--color-base-300)] " +
  "focus:[--input-color:var(--color-primary)]! " +
  "focus:shadow-[0_0_0_4px_rgba(77,209,224,0.25)]!";
