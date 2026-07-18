/**
 * Generates PWA PNG icons from the SVG source using @resvg/resvg-js.
 * Run: node scripts/gen-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_ICONS = resolve(ROOT, "artifacts/anime-site/public/icons");

mkdirSync(PUBLIC_ICONS, { recursive: true });

// Use canvas-based approach since resvg may not be installed
// We'll draw the icon manually via a minimal canvas renderer

const { createCanvas } = await import("canvas").catch(() => null) ?? {};

if (!createCanvas) {
  // Fallback: use sharp with an SVG buffer if canvas is unavailable
  const sharp = (await import("sharp").catch(() => null))?.default;
  if (!sharp) {
    console.error("Neither 'canvas' nor 'sharp' is available. Install one first.");
    process.exit(1);
  }

  const svgSrc = readFileSync(resolve(PUBLIC_ICONS, "icon.svg"));

  for (const size of [192, 512]) {
    const buf = await sharp(svgSrc).resize(size, size).png().toBuffer();
    writeFileSync(resolve(PUBLIC_ICONS, `icon-${size}.png`), buf);
    writeFileSync(resolve(PUBLIC_ICONS, `maskable-${size}.png`), buf);
    console.log(`✓ icon-${size}.png`);
  }
  process.exit(0);
}

// canvas path
function drawIcon(size, maskable) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const r = maskable ? 0 : size * 0.188; // maskable = full bleed square

  // Background
  ctx.fillStyle = "#060608";
  if (r > 0) {
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  // Glow
  const glow = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size*0.4);
  glow.addColorStop(0, "rgba(255,107,53,0.15)");
  glow.addColorStop(1, "rgba(255,107,53,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Play triangle
  const pad = maskable ? size * 0.22 : size * 0.29;
  const cx = size / 2;
  const cy = size / 2;
  const tw = size - pad * 2;
  const th = tw * 0.8;

  const grad = ctx.createLinearGradient(cx - tw/2, cy - th/2, cx + tw/2, cy + th/2);
  grad.addColorStop(0, "#ff6b35");
  grad.addColorStop(1, "#ff9255");
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(cx - tw/2, cy - th/2);
  ctx.lineTo(cx - tw/2, cy + th/2);
  ctx.lineTo(cx + tw/2, cy);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer("image/png");
}

for (const size of [192, 512]) {
  writeFileSync(resolve(PUBLIC_ICONS, `icon-${size}.png`), drawIcon(size, false));
  writeFileSync(resolve(PUBLIC_ICONS, `maskable-${size}.png`), drawIcon(size, true));
  console.log(`✓ icon-${size}.png  maskable-${size}.png`);
}
console.log("Done!");
