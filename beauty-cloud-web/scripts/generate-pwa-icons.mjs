import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
const themeColor = process.env.PWA_THEME_COLOR ?? "#2F523F";

async function renderIcon(size) {
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.34);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${themeColor}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
    fill="#ffffff" font-family="system-ui,-apple-system,sans-serif"
    font-weight="700" font-size="${fontSize}">BC</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const size of [180, 192, 512]) {
    const buffer = await renderIcon(size);
    const filename = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
    fs.writeFileSync(path.join(outDir, filename), buffer);
    console.log(`Wrote public/icons/${filename}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
