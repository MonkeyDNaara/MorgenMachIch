// Generates every raster icon from the SVG sources in assets/brand (#174).
// Run with `npm run icons` after changing a source SVG; the output is committed,
// so builds never depend on this script (or on sharp being installed).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = (name) => join(root, "assets/brand", name);

/** Renders an SVG source to a square PNG buffer. A high density keeps
 * small sizes crisp (sharp rasterises the vector before resizing). */
async function png(source, size) {
  const svg = await readFile(brand(source));
  return sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/** A .ico file that simply wraps PNG images — supported by every current
 * browser. Layout: 6-byte header, one 16-byte entry per image, image data. */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colours
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

async function write(path, data) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
  console.log(`  ${path} (${data.length} bytes)`);
}

console.log("Generating icons from assets/brand …");
// Browser tab: SVG for modern browsers, ICO (16/32/48) as the fallback.
await write("app/icon.svg", await readFile(brand("favicon.svg")));
const icoSizes = [16, 32, 48];
await write(
  "app/favicon.ico",
  ico(
    await Promise.all(
      icoSizes.map(async (size) => ({
        size,
        data: await png("favicon.svg", size),
      })),
    ),
  ),
);
// iOS home screen (iOS rounds the corners itself, so the full-bleed tile).
await write("app/apple-icon.png", await png("icon.svg", 180));
// Web app manifest (#80).
await write("public/icons/icon-192.png", await png("icon.svg", 192));
await write("public/icons/icon-512.png", await png("icon.svg", 512));
await write("public/icons/maskable-512.png", await png("icon-maskable.svg", 512));
// Manifest shortcuts (long-press menu on the installed app icon).
for (const name of ["new", "today", "calendar"]) {
  await write(`public/icons/shortcut-${name}-96.png`, await png(`shortcut-${name}.svg`, 96));
}
console.log("Done.");
