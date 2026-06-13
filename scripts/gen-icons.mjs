/**
 * Generate DriveScore PWA + favicon assets from the DS mark.
 * Run: node scripts/gen-icons.mjs
 *
 * Draws everything with canvas primitives (rounded teal tile, ink chevron,
 * bold "DS") so it needs no external font file — uses a bold sans fallback.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";

const TEAL = "#00E0B8";
const INK = "#06140f";

// Try to use any registered bold sans; napi-rs ships a default.
const family =
  GlobalFonts.families?.find((f) => /Mont|Arial|Helvetica|DejaVu|Sans/i.test(f.family))
    ?.family || "sans-serif";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw the mark into a `size`px canvas. `pad` = tile inset (for maskable). */
function drawIcon(size, pad = 0) {
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  const s = size / 120; // design grid is 120

  if (pad > 0) {
    // maskable: full-bleed teal background, tile content inset into safe zone
    ctx.fillStyle = TEAL;
    ctx.fillRect(0, 0, size, size);
  }

  const tile = size - pad * 2;
  const tx = pad,
    ty = pad;

  // teal rounded tile
  ctx.fillStyle = TEAL;
  roundRect(ctx, tx, ty, tile, tile, 28 * (tile / 120));
  ctx.fill();

  const g = tile / 120; // grid scale within tile
  const ox = tx,
    oy = ty;

  // chevron  M40 40 L60 24 L80 40
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7 * g;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(ox + 40 * g, oy + 40 * g);
  ctx.lineTo(ox + 60 * g, oy + 24 * g);
  ctx.lineTo(ox + 80 * g, oy + 40 * g);
  ctx.stroke();

  // "DS"
  ctx.fillStyle = INK;
  ctx.font = `900 ${52 * g}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DS", ox + 60 * g, oy + 64 * g);

  return c;
}

mkdirSync("public/icons", { recursive: true });

const out = [
  ["public/icons/icon-192.png", 192, 0],
  ["public/icons/icon-512.png", 512, 0],
  ["public/icons/icon-maskable-512.png", 512, 56], // ~11% safe-zone inset
  ["public/icons/apple-icon-180.png", 180, 0],
];
for (const [path, size, pad] of out) {
  writeFileSync(path, drawIcon(size, pad).toBuffer("image/png"));
  console.log("wrote", path, `(${size}px${pad ? ", maskable" : ""})`);
}
console.log("font used:", family);
