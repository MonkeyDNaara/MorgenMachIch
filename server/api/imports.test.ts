import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `server/api` is the HTTP layer (#455): only Route Handlers (`app/`) and other server
 * code may use it. ESLint already keeps client code away from all of `server/`; this
 * also covers root files (e.g. `proxy.ts`) and `scripts/`.
 */
const ROOT = process.cwd();
const SKIP = new Set([
  "node_modules",
  ".next",
  ".git",
  "app",
  "server",
  "Claude outputs",
  "documents",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") && entry.isDirectory()) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return dir === ROOT && SKIP.has(entry.name) ? [] : sourceFiles(path);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [path] : [];
  });
}

describe("server/api imports (#455)", () => {
  it("is used only from app/ and server/", () => {
    const offenders = sourceFiles(ROOT)
      .filter((file) => /["']@\/server\/api\//.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
