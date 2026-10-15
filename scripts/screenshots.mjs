// Recreates the landing page screenshots (#376) from the sample data:
// four views × light and dark, as WebP in public/site/screens (committed).
// Run `npm run build` first, then `npm run screenshots`. The script starts
// the production build itself on a free port; set SCREENSHOT_URL to use a
// server that is already running instead.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/site/screens");

/** The pages to capture; `prepare` puts a page into the state worth showing. */
const VIEWS = [
  { id: "today" },
  // "All" starts with last week's done tasks — show what's still open.
  {
    id: "tasks",
    prepare: (page) => page.getByRole("radio", { name: "Open", exact: true }).click(),
  },
  { id: "calendar" },
  { id: "stats" },
];
const THEMES = ["dark", "light"];
const VIEWPORT = { width: 1280, height: 800 };
const WEBP_QUALITY = 85;
const MAX_BYTES = 150 * 1024;
const THEME_KEY = "morgenmachich:theme"; // lib/ui/themePreference.ts
const SAMPLE_LOADED = "Sample data loaded";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, child, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error("`next start` exited early");
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No answer from ${url} after ${timeoutMs / 1000} s`);
}

async function startServer() {
  if (!existsSync(join(root, ".next/BUILD_ID"))) {
    throw new Error("No production build found — run `npm run build` first.");
  }
  const port = await freePort();
  const child = spawn(join(root, "node_modules/.bin/next"), ["start", "-p", String(port)], {
    cwd: root,
    stdio: "ignore",
  });
  const baseUrl = `http://localhost:${port}`;
  await waitForServer(`${baseUrl}/today`, child);
  return { baseUrl, stop: () => child.kill() };
}

/** Waits until the page has settled: no requests in flight, web fonts in. */
async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

async function capture(browser, baseUrl, theme) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: theme,
    reducedMotion: "reduce",
    locale: "en-US",
  });
  await context.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [THEME_KEY, theme],
  );
  const page = await context.newPage();

  // A fresh context has an empty database, so the sample data always loads.
  await page.goto(`${baseUrl}/today?sample=1`);
  const toast = page.getByRole("status").getByText(SAMPLE_LOADED);
  await toast.waitFor({ timeout: 15_000 });
  await toast.waitFor({ state: "detached", timeout: 15_000 });

  const files = [];
  for (const view of VIEWS) {
    await page.goto(`${baseUrl}/${view.id}`);
    await settle(page);
    if (view.prepare) {
      await view.prepare(page);
      await settle(page);
    }
    const png = await page.screenshot();
    const webp = await sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer();
    const file = `${view.id}-${theme}.webp`;
    await writeFile(join(outDir, file), webp);
    files.push({ file, bytes: webp.length });
  }
  await context.close();
  return files;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const external = process.env.SCREENSHOT_URL?.replace(/\/$/, "");
  const server = external ? { baseUrl: external, stop: () => {} } : await startServer();
  let browser;
  let tooBig = 0;
  try {
    browser = await chromium.launch();
    for (const theme of THEMES) {
      for (const { file, bytes } of await capture(browser, server.baseUrl, theme)) {
        const warn = bytes > MAX_BYTES ? "  ← over 150 KB" : "";
        if (warn) tooBig++;
        console.log(`public/site/screens/${file}  ${Math.round(bytes / 1024)} KB${warn}`);
      }
    }
  } finally {
    await browser?.close();
    server.stop();
  }
  if (tooBig) console.warn(`${tooBig} image(s) over the budget — try a lower WEBP_QUALITY.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
