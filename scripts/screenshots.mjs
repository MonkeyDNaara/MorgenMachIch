// Recreates the landing page screenshots (#376) from the sample data:
// four views × light and dark, as WebP in public/site/screens, plus the
// link-preview image app/opengraph-image.jpg (#377). All are committed.
// Run `npm run build` first, then `npm run screenshots`. The script starts
// the production build itself on a free port; set SCREENSHOT_URL to use a
// server that is already running instead.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const OG_SIZE = { width: 1200, height: 630 };
const OG_FILE = "app/opengraph-image.jpg";

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
    files.push({ file: `public/site/screens/${file}`, data: webp });
  }
  await context.close();
  return files;
}

/**
 * The Open Graph card (#377): the landing page brings the fonts and theme
 * tokens, scripts/og-card.html replaces its body, the Today shot goes in.
 */
async function captureOgImage(browser, baseUrl, todayShot) {
  const context = await browser.newContext({
    viewport: OG_SIZE,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [THEME_KEY, "dark"],
  );
  const page = await context.newPage();
  await page.goto(`${baseUrl}/?landing`);
  await settle(page);
  const card = (await readFile(join(root, "scripts/og-card.html"), "utf8")).replaceAll(
    "{{TODAY_SCREENSHOT}}",
    `data:image/webp;base64,${todayShot.toString("base64")}`,
  );
  await page.evaluate((html) => {
    document.body.className = "";
    document.body.innerHTML = html;
  }, card);
  // decode() rejects for an image that fails to load, so a broken card fails the run.
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  await settle(page);
  const jpg = await sharp(await page.screenshot())
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  await writeFile(join(root, OG_FILE), jpg);
  await context.close();
  return { file: OG_FILE, data: jpg };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const external = process.env.SCREENSHOT_URL?.replace(/\/$/, "");
  const server = external ? { baseUrl: external, stop: () => {} } : await startServer();
  let browser;
  let tooBig = 0;
  try {
    browser = await chromium.launch();
    const files = [];
    for (const theme of THEMES) files.push(...(await capture(browser, server.baseUrl, theme)));
    const todayShot = files.find(({ file }) => file.endsWith("today-dark.webp")).data;
    files.push(await captureOgImage(browser, server.baseUrl, todayShot));
    for (const { file, data } of files) {
      const warn = data.length > MAX_BYTES ? "  ← over 150 KB" : "";
      if (warn) tooBig++;
      console.log(`${file}  ${Math.round(data.length / 1024)} KB${warn}`);
    }
  } finally {
    await browser?.close();
    server.stop();
  }
  if (tooBig) console.warn(`${tooBig} image(s) over the budget — try a lower quality.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
