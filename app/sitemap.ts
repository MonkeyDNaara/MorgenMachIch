import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/siteUrl";

/**
 * `/sitemap.xml` (#377): only the public pages. The app routes show
 * nothing without local data, so they are noindex and left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", SITE_URL).href, changeFrequency: "monthly", priority: 1 }];
}
