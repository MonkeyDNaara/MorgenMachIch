// Runs the whole Vitest suite once per time zone (#339) — the same four
// zones as the CI matrix: DST in Europe and the US, a +5:30 offset, and a
// zone far east of UTC (date-only values parsed as UTC break west of UTC,
// see #279).
import { spawnSync } from "node:child_process";

const ZONES = ["Europe/Berlin", "America/Los_Angeles", "Asia/Kolkata", "Pacific/Auckland"];

let failed = 0;
for (const zone of ZONES) {
  console.log(`\n── TZ=${zone} ──`);
  const result = spawnSync("npx", ["vitest", "run"], {
    stdio: "inherit",
    env: { ...process.env, TZ: zone },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) failed++;
}
if (failed > 0) {
  console.error(`\n${failed} of ${ZONES.length} time zones failed.`);
  process.exit(1);
}
console.log(`\nAll ${ZONES.length} time zones passed.`);
