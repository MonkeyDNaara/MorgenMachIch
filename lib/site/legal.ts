/**
 * Provider details for the Impressum and the privacy notice (#378). The
 * only place on the site with an address and an email — required by § 5
 * DDG. Both pages are noindex, so search engines don't list them.
 */
export const PROVIDER = {
  name: "Niko Klam",
  street: "Schlachthofstraße 12",
  city: "17235 Neustrelitz",
  country: "Deutschland",
  email: "niko.klam@yahoo.com",
} as const;

/** Footer and settings links to the legal pages. */
export const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
] as const;

/** Date of the last change to the privacy notice — update with every edit. */
export const PRIVACY_UPDATED = "15. Oktober 2026";
