/**
 * Pure-Node.js PNG icon generator — no native deps.
 * Run: node scripts/gen-icons-pure.mjs
 */
import { deflate }  from "node:zlib";
import { promisify } from "node:util";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname }        from "node:path";
import { fileURLToPath }           from "node:url";

const deflateAsync = promisify(deflate);
const __dirname    = dirname(fileURLToPath(import.meta.url));
const ROOT         = resolve(__dirname, "..");
const OUT          = resolve(ROOT, "artifacts/anime-site/public/icons");
mkdirSync(OUT, { recursive: true });

// ── CRC32 + PNG chunk helpers ─────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, "ascii");
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([t, data]);
  const crcBuf   = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, t, data, crcBuf]);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
async function makePNG(size, maskable) {
  const rgba = new Uint8Array(size * size * 4);

  // Colors
  const BG  = [6,   6,   8];
  const P1  = [255, 107, 53];  // #ff6b35
  const P2  = [255, 146, 85];  // #ff9255

  // Triangle vertices (pointing right = play button)
  const pad = maskable ? size * 0.18 : size * 0.26;
  const lx  = pad,          ly0 = pad,        ly1 = size - pad;
  const rx  = size - pad,   ry  = size / 2;

  // Rounded-rect clip radius (0 for maskable = full bleed)
  const R = maskable ? 0 : size * 0.188;

  function inRR(x, y) {
    if (R === 0) return true;
    const dx = Math.max(R - x,        0, x - (size - R));
    const dy = Math.max(R - y,        0, y - (size - R));
    return dx * dx + dy * dy <= R * R;
  }

  function sign(px, py, ax, ay, bx, by) {
    return (px - bx) * (ay - by) - (ax - bx) * (py - by);
  }
  function inTri(px, py) {
    const d1 = sign(px, py, lx, ly0, lx, ly1);
    const d2 = sign(px, py, lx, ly1, rx, ry);
    const d3 = sign(px, py, rx, ry,  lx, ly0);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }

  const cx = size / 2, cy2 = size / 2, glowR = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRR(x, y)) { rgba[i+3] = 0; continue; }

      if (inTri(x, y)) {
        const t = Math.max(0, Math.min(1, (x - lx) / (rx - lx)));
        rgba[i]   = Math.round(P1[0] + (P2[0] - P1[0]) * t);
        rgba[i+1] = Math.round(P1[1] + (P2[1] - P1[1]) * t);
        rgba[i+2] = Math.round(P1[2] + (P2[2] - P1[2]) * t);
        rgba[i+3] = 255;
      } else {
        const dist  = Math.hypot(x - cx, y - cy2);
        const glow  = Math.max(0, 1 - dist / glowR) ** 2 * 0.18;
        rgba[i]   = Math.min(255, Math.round(BG[0] + 255 * glow * 1.0));
        rgba[i+1] = Math.min(255, Math.round(BG[1] + 255 * glow * 0.42));
        rgba[i+2] = Math.min(255, Math.round(BG[2] + 255 * glow * 0.21));
        rgba[i+3] = 255;
      }
    }
  }

  // Build raw scanlines (filter byte 0 = None per row)
  const stride = 1 + size * 4;
  const raw    = Buffer.allocUnsafe(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const si = (y * size + x) * 4;
      const di = y * stride + 1 + x * 4;
      raw[di]   = rgba[si];
      raw[di+1] = rgba[si+1];
      raw[di+2] = rgba[si+2];
      raw[di+3] = rgba[si+3];
    }
  }

  const idat = await deflateAsync(raw, { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Generate all sizes ────────────────────────────────────────────────────────
for (const size of [192, 512]) {
  for (const maskable of [false, true]) {
    const buf  = await makePNG(size, maskable);
    const name = maskable ? `maskable-${size}.png` : `icon-${size}.png`;
    writeFileSync(resolve(OUT, name), buf);
    process.stdout.write(`✓ ${name}  `);
  }
}
console.log("\nDone!");
