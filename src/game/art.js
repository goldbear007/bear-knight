/** Painted Moonwatch (Лунный дозор) art pack. Falls back to nulls if a file is missing. */

const BASE = "assets/art/moonwatch";

export const Art = {
  ready: false,
  sky: null,
  far: null,
  mid: null,
  farVillage: null,
  farWastes: null,
  farCitadel: null,
  farCatacombs: null,
  midVillage: null,
  midCatacombs: null,
  midWastes: null,
  midCitadel: null,
  tree: null,
  pillar: null,
  arch: null,
  stone: null,
  stoneForest: null,
  stoneVillage: null,
  stoneCatacombs: null,
  stoneWastes: null,
  stoneCitadel: null,
  platform: null,
  platformForest: null,
  groundTop: null,
  groundForest: null,
  groundVillage: null,
  groundCatacombs: null,
  groundWastes: null,
  groundCitadel: null,
  bush: null,
  spikes: null,
  chest: null,
  grave: null,
  firepit: null,
  firepitUnlit: null,
  rock: null,
  house: null,
  lamp: null,
  wall: null,
  window: null,
  spire: null,
  bones: null,
  ice: null,
  fence: null,
  weapons: {},
};

const WEAPON_IDS = [
  "rusty-sword",
  "hunter-dagger",
  "iron-longsword",
  "bear-claw-axe",
  "wolfbane-blade",
  "grimhollow-maul",
  "moonfang-saber",
  "dread-bear-cleaver",
];

const patternCache = new Map();

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Moonwatch art missing:", src);
      resolve(null);
    };
    img.src = `${src}?v=9`;
  });
}

export async function loadArt() {
  const [
    sky, far, mid, tree, pillar, arch, stone, platform, groundTop,
    bush, spikes, chest, grave, firepit, firepitUnlit, rock,
    house, lamp, wall, window,
    farVillage, farWastes, farCitadel, farCatacombs,
    midVillage, midCatacombs, midWastes, midCitadel,
    stoneForest, stoneVillage, stoneCatacombs, stoneWastes, stoneCitadel,
    groundForest, groundVillage, groundCatacombs, groundWastes, groundCitadel,
    platformForest,
    spire, bones, ice, fence,
    ...weaponImgs
  ] = await Promise.all([
    loadImage(`${BASE}/sky.png`),
    loadImage(`${BASE}/far.png`),
    loadImage(`${BASE}/mid.png`),
    loadImage(`${BASE}/tree.png`),
    loadImage(`${BASE}/pillar.png`),
    loadImage(`${BASE}/arch.png`),
    loadImage(`${BASE}/stone.png`),
    loadImage(`${BASE}/platform.png`),
    loadImage(`${BASE}/ground-top.png`),
    loadImage(`${BASE}/bush.png`),
    loadImage(`${BASE}/spikes.png`),
    loadImage(`${BASE}/chest.png`),
    loadImage(`${BASE}/grave.png`),
    loadImage(`${BASE}/firepit.png`),
    loadImage(`${BASE}/firepit-unlit.png`),
    loadImage(`${BASE}/rock.png`),
    loadImage(`${BASE}/house.png`),
    loadImage(`${BASE}/lamp.png`),
    loadImage(`${BASE}/wall.png`),
    loadImage(`${BASE}/window.png`),
    loadImage(`${BASE}/far-village.png`),
    loadImage(`${BASE}/far-wastes.png`),
    loadImage(`${BASE}/far-citadel.png`),
    loadImage(`${BASE}/far-catacombs.png`),
    loadImage(`${BASE}/mid-village.png`),
    loadImage(`${BASE}/mid-catacombs.png`),
    loadImage(`${BASE}/mid-wastes.png`),
    loadImage(`${BASE}/mid-citadel.png`),
    loadImage(`${BASE}/stone-forest.png`),
    loadImage(`${BASE}/stone-village.png`),
    loadImage(`${BASE}/stone-catacombs.png`),
    loadImage(`${BASE}/stone-wastes.png`),
    loadImage(`${BASE}/stone-citadel.png`),
    loadImage(`${BASE}/ground-forest.png`),
    loadImage(`${BASE}/ground-village.png`),
    loadImage(`${BASE}/ground-catacombs.png`),
    loadImage(`${BASE}/ground-wastes.png`),
    loadImage(`${BASE}/ground-citadel.png`),
    loadImage(`${BASE}/platform-forest.png`),
    loadImage(`${BASE}/spire.png`),
    loadImage(`${BASE}/bones.png`),
    loadImage(`${BASE}/ice.png`),
    loadImage(`${BASE}/fence.png`),
    ...WEAPON_IDS.map((id) => loadImage(`${BASE}/weapon-${id}.png`)),
  ]);
  const weapons = {};
  WEAPON_IDS.forEach((id, i) => {
    weapons[id] = weaponImgs[i] || null;
  });
  Object.assign(Art, {
    sky, far, mid, tree, pillar, arch, stone, platform, groundTop,
    bush, spikes, chest, grave, firepit, firepitUnlit, rock,
    house, lamp, wall, window,
    farVillage, farWastes, farCitadel, farCatacombs,
    midVillage, midCatacombs, midWastes, midCitadel,
    stoneForest, stoneVillage, stoneCatacombs, stoneWastes, stoneCitadel,
    groundForest, groundVillage, groundCatacombs, groundWastes, groundCitadel,
    platformForest,
    spire, bones, ice, fence,
    weapons,
    ready: true,
  });
  return Art;
}

export function farPlate(biome) {
  return [Art.far, Art.farVillage, Art.farCatacombs, Art.farWastes, Art.farCitadel][biome] || Art.far;
}

export function midPlate(biome) {
  return [Art.mid, Art.midVillage, Art.midCatacombs, Art.midWastes, Art.midCitadel][biome] || null;
}

export function stonePlate(biome) {
  return [Art.stoneForest, Art.stoneVillage, Art.stoneCatacombs, Art.stoneWastes, Art.stoneCitadel][biome] || Art.stone;
}

export function groundTopPlate(biome) {
  return [Art.groundForest, Art.groundVillage, Art.groundCatacombs, Art.groundWastes, Art.groundCitadel][biome] || Art.groundTop;
}

export function platformPlate(biome) {
  return [Art.platformForest, Art.platform, Art.platform, Art.platform, Art.platform][biome] || Art.platform;
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
  const h = Math.round(height);
  const w = Math.max(2, Math.round(img.width * (h / img.height)));
  ctx.save();
  paintSmooth(ctx);
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}
