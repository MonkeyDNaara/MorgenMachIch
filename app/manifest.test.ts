import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest (#465)", () => {
  const m = manifest();

  it("opens the installed app on the dashboard", () => {
    expect(m.start_url).toBe("/dashboard");
  });

  it("keeps the app id, so installed apps stay the same app", () => {
    expect(m.id).toBe("/today");
  });

  it("points the shortcuts at existing pages", () => {
    expect(m.shortcuts?.map((shortcut) => shortcut.url)).toEqual([
      "/dashboard?new=1",
      "/today",
      "/calendar",
    ]);
  });
});
