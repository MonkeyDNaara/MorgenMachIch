import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Local runs default to Berlin; CI overrides TZ per matrix job (#339).
// Set here (not in the npm script) so it also works on Windows shells.
process.env.TZ ??= "Europe/Berlin";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    // Same `@/` alias as tsconfig.json, without an extra plugin.
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "Claude outputs/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "components/**/*.tsx"],
      exclude: ["**/*.test.{ts,tsx}", "lib/test/**"],
      reporter: ["text-summary", "text"],
    },
  },
});
