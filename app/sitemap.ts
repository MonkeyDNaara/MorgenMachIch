import type { MetadataRoute } from "next";
import { SITE_URL } from "@/features/site/lib/siteUrl";

/**
 * `/sitemap.xml` (#377): only the landing page. The app routes show
 * nothing without local data, and the Impressum and privacy notice (#378)
 * hold an address — all noindex, so all left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", SITE_URL).href, changeFrequency: "monthly", priority: 1 }];
}
