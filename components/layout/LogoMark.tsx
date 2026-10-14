/**
 * The app's logo (#174): the compact mark — a sun rising out of the notch
 * of a card with a check — on its night-blue tile. Same colours in both
 * themes, like an app icon. Inline SVG (no request, no flash); it mirrors
 * `assets/brand/favicon.svg`, the source of the favicon, so change both
 * together. Decorative: the visible "MorgenMachIch" text or the page
 * carries the name.
 */
export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className="shrink-0"
    >
      <rect width="512" height="512" rx="112" fill="#0b1214" />
      <path
        d="M256 112 V92 M320 138 L338 120 M192 138 L174 120"
        stroke="#ffb26a"
        strokeWidth="30"
        strokeLinecap="round"
      />
      <path d="M186 222 A70 70 0 0 1 326 222 Z" fill="#ff9f5a" />
      <path
        d="M136 192 H168 C182 192 190 197 199 206 L214 221 C222 229 230 232 242 232 H270 C282 232 290 229 298 221 L313 206 C322 197 330 192 344 192 H376 A48 48 0 0 1 424 240 V384 A48 48 0 0 1 376 432 H136 A48 48 0 0 1 88 384 V240 A48 48 0 0 1 136 192 Z"
        fill="#17323c"
      />
      <path
        d="M168 332 L226 392 L346 270"
        stroke="#4dd1e0"
        strokeWidth="48"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
