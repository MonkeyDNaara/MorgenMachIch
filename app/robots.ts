import type { MetadataRoute } from "next";
import { SITE_URL } from "@/features/site/lib/siteUrl";

/**
 * `/robots.txt` (#377). Nothing is blocked: crawlers must be able to load
 * the app routes to see their noindex (a robots.txt block would hide it).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", SITE_URL).href,
  };
}
