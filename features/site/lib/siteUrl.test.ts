import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, resolveSiteUrl } from "./siteUrl";

describe("resolveSiteUrl", () => {
  it("falls back to the Render URL when nothing is set", () => {
    expect(resolveSiteUrl(undefined).href).toBe(`${DEFAULT_SITE_URL}/`);
    expect(resolveSiteUrl("  ").href).toBe(`${DEFAULT_SITE_URL}/`);
  });

  it("keeps only the origin of a configured URL", () => {
    expect(resolveSiteUrl("https://morgen.example.com/").href).toBe("https://morgen.example.com/");
    expect(resolveSiteUrl(" https://morgen.example.com/app?x=1 ").href).toBe(
      "https://morgen.example.com/",
    );
    expect(resolveSiteUrl("http://localhost:3000").href).toBe("http://localhost:3000/");
  });

  it("ignores values that are not http(s) URLs", () => {
    expect(resolveSiteUrl("morgen.example.com").href).toBe(`${DEFAULT_SITE_URL}/`);
    expect(resolveSiteUrl("ftp://morgen.example.com").href).toBe(`${DEFAULT_SITE_URL}/`);
  });
});
