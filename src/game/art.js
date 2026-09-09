/** Painted Moonwatch (Лунный дозор) art pack. Falls back to nulls if a file is missing. */

const BASE = "assets/art/moonwatch";

export const Art = {
  ready: false,
  sky: null,
  far: null,
  mid: null,
  tree: null,
  pillar: null,
  arch: null,
  stone: null,
  platform: null,
  groundTop: null,
};

const patternCache = new Map();

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Moonwatch art missing:", src);
      resolve(null);
    };
    img.src = src;
  });
}

export async function loadArt() {
  const [sky, far, mid, tree, pillar, arch, stone, platform, groundTop] = await Promise.all([
    loadImage(`${BASE}/sky.png`),
    loadImage(`${BASE}/far.png`),
    loadImage(`${BASE}/mid.png`),
    loadImage(`${BASE}/tree.png`),
    loadImage(`${BASE}/pillar.png`),
    loadImage(`${BASE}/arch.png`),
    loadImage(`${BASE}/stone.png`),
    loadImage(`${BASE}/platform.png`),
    loadImage(`${BASE}/ground-top.png`),
  ]);
  Object.assign(Art, {
    sky,
    far,
    mid,
    tree,
    pillar,
    arch,
    stone,
    platform,
    groundTop,
    ready: true,
  });
  return Art;
}

/**
 * World-aligned repeating fill. `heightPx` is the baked repeat height in
 * world pixels so a 32px tile shows grain instead of a whole painting.
 */
export function tilePattern(ctx, img, heightPx, tint) {
  if (!img || !ctx) return null;
  const key = `${img.src}|${heightPx}|${tint || ""}`;
  if (patternCache.has(key)) return patternCache.get(key);
  const h = Math.max(8, Math.round(heightPx));
  const w = Math.max(32, Math.round(img.width * (h / img.height)));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in g) g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, w, h);
  if (tint) {
    g.globalAlpha = 0.38;
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = tint;
    g.fillRect(0, 0, w, h);
  }
  const pat = ctx.createPattern(c, "repeat");
  patternCache.set(key, pat);
  return pat;
}

function paintSmooth(ctx) {
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
}

/** Horizontally tiled parallax strip, bottom-aligned by default. */
export function drawTiledLayer(ctx, img, camX, parallax, W, H, opts = {}) {
  if (!img) return;
  const heightRatio = opts.heightRatio ?? 1;
  const align = opts.align ?? "bottom";
  const alpha = opts.alpha ?? 1;
  const targetH = H * heightRatio;
  const scale = targetH / img.height;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const y = align === "bottom" ? H - dh : 0;
  const wrapped = ((((camX * parallax) % dw) + dw) % dw);
  ctx.save();
  paintSmooth(ctx);
  ctx.globalAlpha = alpha;
  for (let x = -wrapped; x < W + dw; x += dw) {
    ctx.drawImage(img, x, y, dw, dh);
  }
  ctx.restore();
}

/** Cover-scale a sky so the moon stays in frame; very slow parallax. */
export function drawSkyCover(ctx, img, camX, W, H) {
  if (!img) return false;
  const scale = Math.max(W / img.width, H / img.height) * 1.04;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const y = (H - dh) * 0.2;
  const wrapped = ((((camX * 0.015) % dw) + dw) % dw);
  ctx.save();
  paintSmooth(ctx);
  for (let x = -wrapped; x < W + dw; x += dw) {
    ctx.drawImage(img, x, y, dw, dh);
  }
  ctx.restore();
  return true;
}

/**
 * Draw a grounded prop. `x,y` is the contact point (bottom-center).
 * Returns false when the image is missing so callers can fall back.
 */
export function drawProp(ctx, img, x, y, height, opts = {}) {
  if (!img || height <= 4) return false;
  const flip = opts.flip ?? false;
  const alpha = opts.alpha ?? 1;
  const scale = height / img.height;
  const w = img.width * scale;
  ctx.save();
  paintSmooth(ctx);
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -height, w, height);
  ctx.restore();
  return true;
}
