import { TILE, SOLID, PLATFORM, SPIKE } from "./world.js";
import { drawKnight, drawSwingArc, drawEnemy } from "./sprites.js";
import { Art, drawSkyCover, drawTiledLayer, drawProp, tilePattern, farPlate, midPlate, stonePlate, groundTopPlate, platformPlate } from "./art.js";
import { clamp, makeRng, roundRect, formatNum, shade } from "../core/utils.js";

const starCache = new Map();

function stars(seed, count, w, h) {
  const key = `${seed}:${count}`;
  if (!starCache.has(key)) {
    const rng = makeRng(seed);
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({ x: rng() * w, y: rng() * h * 0.62, r: rng() * 1.3 + 0.3, tw: rng() * 6 });
    }
    starCache.set(key, list);
  }
  return starCache.get(key);
}

function ridge(ctx, camX, parallax, baseY, amp, step, color, seed, W, H) {
  const rng = makeRng(seed);
  const offsets = [];
  for (let i = 0; i < 200; i++) offsets.push(rng());
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, H);
  const shift = camX * parallax;
  for (let x = -40, i = 0; x <= W + 40; x += step, i++) {
    const o = offsets[(i + Math.floor(shift / step)) % offsets.length];
    const y = baseY - o * amp - Math.sin((x + shift) * 0.01) * amp * 0.4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 40, H);
  ctx.closePath();
  ctx.fill();
}

export function drawBackground(ctx, world, camera, time, W, H) {
  const p = world.cfg.palette;
  const biome = world.cfg.id;
  const outdoor = biome !== 2;
  ctx.fillStyle = p.sky[0];
  ctx.fillRect(0, 0, W, H);
  const paintedSky = outdoor && drawSkyCover(ctx, Art.sky, camera.x, W, H);

  if (!paintedSky) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, p.sky[0]);
    sky.addColorStop(0.55, p.sky[1]);
    sky.addColorStop(1, p.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
  }

  const starCount = paintedSky ? 24 : biome === 2 ? 12 : 140;
  ctx.save();
  for (const s of stars(world.cfg.seed, starCount, W, H)) {
    const twinkle = 0.35 + Math.abs(Math.sin(time * 1.6 + s.tw)) * 0.65;
    ctx.globalAlpha = twinkle * (paintedSky ? 0.35 : 0.75);
    ctx.fillStyle = "#dfe6ff";
    ctx.fillRect(s.x - camera.x * 0.02, s.y, s.r, s.r);
  }
  ctx.restore();

  if (!paintedSky && biome !== 2) {
    const moonX = W * 0.78 - camera.x * 0.03;
    const moonY = H * 0.18;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = p.moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = shade(p.sky[1], 8);
    ctx.beginPath();
    ctx.arc(moonX - 14, moonY - 10, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const far = farPlate(biome);
  if (far) {
    const farAlpha = biome === 2 ? 0.92 : biome === 3 ? 0.82 : 0.94;
    const farH = biome === 2 ? 1 : 0.94;
    drawTiledLayer(ctx, far, camera.x, 0.07, W, H, { heightRatio: farH, alpha: farAlpha });
  } else {
    ridge(ctx, camera.x, 0.08, H * 0.72, 120, 46, p.far, world.cfg.seed + 11, W, H);
    ridge(ctx, camera.x, 0.18, H * 0.86, 90, 34, p.mid, world.cfg.seed + 22, W, H);
  }

  const mid = midPlate(biome);
  if (mid) {
    const midH = [0.38, 0.46, 0.72, 0.42, 0.4][biome] || 0.4;
    const midAlpha = biome === 2 ? 0.82 : 0.9;
    drawTiledLayer(ctx, mid, camera.x, 0.2, W, H, { heightRatio: midH, alpha: midAlpha });
  }

  if (biome !== 2) {
    ridge(ctx, camera.x, 0.32, H * 1.02, biome === 4 ? 36 : 56, 26, p.near, world.cfg.seed + 33, W, H);
  }

  ctx.fillStyle = p.fog;
  ctx.fillRect(0, biome === 2 ? H * 0.42 : H * 0.55, W, H);
}

/** Ambient motes: moonlight dust, ash, ossuary dust, ice or citadel sparks. */
export function drawWeather(ctx, world, camera, time, W, H) {
  const rng = makeRng(world.cfg.seed + 99);
  const p = world.cfg.palette;
  const biome = world.cfg.id;
  ctx.save();
  const count = biome === 3 ? 90 : 70;
  for (let i = 0; i < count; i++) {
    const seedX = rng() * 2000;
    const drift = rng() * 80;
    const size = biome === 3 ? 1 + rng() * 2.4 : 1 + rng() * 2;
    let speed;
    let color;
    let alpha;
    if (biome === 1) {
      speed = 24 + rng() * 36;
      color = p.accent;
      alpha = 0.1 + (i % 5) * 0.035;
    } else if (biome === 2) {
      speed = -(8 + rng() * 14);
      color = p.accent;
      alpha = 0.08 + (i % 5) * 0.03;
    } else if (biome === 3) {
      speed = 18 + rng() * 28;
      color = p.moonRim || p.moon;
      alpha = 0.12 + (i % 5) * 0.04;
    } else if (biome === 4) {
      speed = 6 + rng() * 12;
      color = p.accent;
      alpha = 0.08 + (i % 6) * 0.025;
    } else {
      speed = 8 + rng() * 18;
      color = p.moonRim || p.moon;
      alpha = 0.1 + (i % 5) * 0.03;
    }
    const wind = biome === 3 ? time * 28 : biome === 1 ? time * 12 : 0;
    const x = ((seedX - camera.x * 0.35 + Math.sin(time * 0.35 + i) * drift + wind) % (W + 60) + W + 60) % (W + 60) - 30;
    const y = ((rng() * H + time * speed) % (H + 40) + H + 40) % (H + 40) - 20;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function drawDecorItem(ctx, d, palette) {
  const rng = makeRng(d.seed);
  const far = d.layer === 0;
  const dark = far ? -45 : -20;
  const flip = d.seed % 2 === 0;
  const alpha = far ? 0.9 : 1;

  if (d.kind === "tree") {
    const h = (far ? 156 : 118) * d.scale;
    if (drawProp(ctx, Art.tree, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "pillar") {
    const h = 128 * d.scale * (far ? 1.08 : 1);
    if (drawProp(ctx, Art.pillar, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "spire") {
    const h = 176 * d.scale * (far ? 1.1 : 1);
    if (drawProp(ctx, Art.spire, d.x, d.y, h, { flip, alpha })) return;
    if (drawProp(ctx, Art.pillar, d.x, d.y, h * 0.85, { flip, alpha })) return;
  } else if (d.kind === "arch") {
    const h = (far ? 148 : 118) * d.scale;
    if (drawProp(ctx, Art.arch, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "bush") {
    const h = (far ? 48 : 40) * d.scale;
    if (drawProp(ctx, Art.bush, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "grave") {
    const h = (far ? 62 : 52) * d.scale;
    if (drawProp(ctx, Art.grave, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "stone" || d.kind === "rock") {
    const h = (far ? 28 : 22) * d.scale;
    if (drawProp(ctx, Art.rock, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "house") {
    const h = (far ? 92 : 78) * d.scale;
    if (drawProp(ctx, Art.house, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "lamp") {
    const h = (far ? 64 : 56) * d.scale;
    if (drawProp(ctx, Art.lamp, d.x, d.y, h, { flip: false, alpha })) return;
  } else if (d.kind === "wall") {
    const h = (far ? 148 : 124) * d.scale;
    if (drawProp(ctx, Art.wall, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "window") {
    const h = (far ? 96 : 78) * d.scale;
    if (drawProp(ctx, Art.window, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "bones") {
    const h = (far ? 44 : 36) * d.scale;
    if (drawProp(ctx, Art.bones, d.x, d.y, h, { flip, alpha })) return;
  } else if (d.kind === "ice") {
    const h = (far ? 42 : 32) * d.scale;
    if (drawProp(ctx, Art.ice, d.x, d.y, h, { flip, alpha })) return;
    if (drawProp(ctx, Art.rock, d.x, d.y, h * 0.9, { flip, alpha })) return;
  } else if (d.kind === "fence") {
    const h = (far ? 44 : 38) * d.scale;
    if (drawProp(ctx, Art.fence, d.x, d.y, h, { flip, alpha })) return;
  }

  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(d.scale, d.scale);

  if (d.kind === "tree") {
    ctx.strokeStyle = shade(palette.ground, dark);
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rng() * 8 - 4, -70);
    ctx.stroke();
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 5; i++) {
      const y = -30 - i * 11;
      const dir = i % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(rng() * 4 - 2, y);
      ctx.quadraticCurveTo(dir * 18, y - 8, dir * 30, y - 24 - rng() * 10);
      ctx.stroke();
    }
  } else if (d.kind === "pillar" || d.kind === "spire") {
    const h = d.kind === "spire" ? 118 : 84;
    ctx.fillStyle = shade(palette.ground, dark + 12);
    ctx.fillRect(-11, -h, 22, h);
    ctx.fillStyle = shade(palette.ground, dark - 8);
    for (let i = 0; i < 5; i++) ctx.fillRect(-11, -h + 4 + i * 17, 22, 3);
    ctx.fillStyle = shade(palette.ground, dark + 20);
    ctx.fillRect(-15, -h - 6, 30, 8);
    if (d.kind === "spire") {
      ctx.beginPath();
      ctx.moveTo(-9, -h - 6);
      ctx.lineTo(0, -h - 36);
      ctx.lineTo(9, -h - 6);
      ctx.fill();
    }
  } else if (d.kind === "arch") {
    ctx.fillStyle = shade(palette.ground, dark + 14);
    ctx.fillRect(-22, -78, 12, 78);
    ctx.fillRect(10, -78, 12, 78);
    ctx.fillRect(-22, -88, 44, 12);
    ctx.fillStyle = shade(palette.ground, dark - 10);
    ctx.beginPath();
    ctx.moveTo(-10, -76);
    ctx.quadraticCurveTo(0, -104, 10, -76);
    ctx.lineTo(10, -68);
    ctx.quadraticCurveTo(0, -90, -10, -68);
    ctx.fill();
  } else if (d.kind === "house") {
    ctx.fillStyle = shade(palette.ground, dark + 8);
    ctx.fillRect(-18, -36, 36, 36);
    ctx.beginPath();
    ctx.moveTo(-22, -36);
    ctx.lineTo(0, -58);
    ctx.lineTo(22, -36);
    ctx.fill();
    ctx.fillStyle = "#e0a45a";
    ctx.globalAlpha = 0.7 + Math.sin(d.seed) * 0.15;
    ctx.fillRect(-10, -24, 7, 8);
    ctx.fillRect(4, -22, 6, 7);
    ctx.globalAlpha = 1;
  } else if (d.kind === "lamp") {
    ctx.fillStyle = shade(palette.ground, dark + 10);
    ctx.fillRect(-2, -28, 4, 28);
    ctx.fillStyle = "#ffcf6b";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, -32, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.kind === "wall" || d.kind === "window") {
    ctx.fillStyle = shade(palette.ground, dark + 14);
    ctx.fillRect(-16, -70, 32, 70);
    ctx.fillStyle = shade(palette.ground, dark + 22);
    ctx.fillRect(-20, -78, 8, 18);
    ctx.fillRect(-4, -84, 8, 24);
    ctx.fillRect(12, -78, 8, 18);
    if (d.kind === "window") {
      ctx.fillStyle = "#e0a45a";
      ctx.globalAlpha = 0.75;
      ctx.fillRect(-6, -48, 10, 16);
      ctx.globalAlpha = 1;
    }
  } else if (d.kind === "grave" || d.kind === "bones") {
    ctx.fillStyle = shade(palette.ground, dark + 16);
    roundRect(ctx, -10, -30, 20, 30, 9);
    ctx.fill();
    ctx.fillStyle = shade(palette.ground, dark - 10);
    ctx.fillRect(-5, -22, 10, 3);
    ctx.fillRect(-2, -26, 4, 14);
  } else if (d.kind === "fence") {
    ctx.strokeStyle = shade(palette.ground, dark + 8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-16, -22);
    ctx.moveTo(16, 0);
    ctx.lineTo(16, -20);
    ctx.moveTo(-18, -16);
    ctx.lineTo(18, -14);
    ctx.moveTo(-16, -8);
    ctx.lineTo(16, -7);
    ctx.stroke();
  } else if (d.kind === "bush") {
    ctx.fillStyle = shade(palette.groundTop || palette.accent, dark);
    ctx.beginPath();
    ctx.ellipse(-6, -10, 10, 9, -0.2, 0, Math.PI * 2);
    ctx.ellipse(7, -11, 11, 10, 0.15, 0, Math.PI * 2);
    ctx.ellipse(0, -16, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = shade(palette.ground, dark + 8);
    ctx.beginPath();
    ctx.ellipse(0, -6, 15, 10, rng() * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWorld(ctx, world, camera, time, W, H) {
  const p = world.cfg.palette;
  const biome = world.cfg.id;
  const x0 = Math.max(0, Math.floor(camera.ox / TILE) - 1);
  const x1 = Math.min(world.w - 1, Math.ceil((camera.ox + W) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(camera.oy / TILE) - 1);
  const y1 = Math.min(world.h - 1, Math.ceil((camera.oy + H) / TILE) + 1);

  // Far decor behind the terrain
  for (const d of world.decor) {
    if (d.layer !== 0) continue;
    if (d.x < camera.ox - 220 || d.x > camera.ox + W + 220) continue;
    drawDecorItem(ctx, d, p);
  }

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = world.get(tx, ty);
      if (tile === 0) continue;
      const px = tx * TILE;
      const py = ty * TILE;

      if (tile === SOLID) {
        const isTop = world.get(tx, ty - 1) !== SOLID;
        const stone = tilePattern(ctx, stonePlate(biome), 96, p.ground);
        if (stone) {
          ctx.fillStyle = stone;
          ctx.fillRect(px, py, TILE, TILE);
        } else {
          ctx.fillStyle = p.ground;
          ctx.fillRect(px, py, TILE, TILE);
        }
        if (isTop) {
          const capH = biome === 0 ? 20 : 14;
          const cap = tilePattern(ctx, groundTopPlate(biome), capH, p.groundTop);
          if (cap) {
            ctx.fillStyle = cap;
            ctx.fillRect(px, py, TILE, capH);
          } else {
            ctx.fillStyle = p.groundTop;
            ctx.fillRect(px, py, TILE, 7);
            ctx.fillStyle = shade(p.groundTop, -25);
            ctx.fillRect(px, py + 7, TILE, 3);
          }
          ctx.fillStyle = p.moonRim || shade(p.moon, -20);
          ctx.globalAlpha = biome === 0 ? 0.16 : 0.32;
          ctx.fillRect(px, py, TILE, biome === 0 ? 1 : 2);
          ctx.globalAlpha = 1;
          if (biome === 0 && Art.bush && (tx * 17) % 7 === 0) {
            drawProp(ctx, Art.bush, px + ((tx * 13) % 18) + 6, py + 2, 16 + (tx % 3) * 4, {
              flip: tx % 2 === 0,
              alpha: 0.9,
            });
          } else if (biome === 1 && Art.rock && (tx * 19) % 9 === 0) {
            drawProp(ctx, Art.rock, px + 14, py + 2, 14, { flip: tx % 2 === 0, alpha: 0.85 });
          } else if (biome === 2 && Art.bones && (tx * 17) % 9 === 0) {
            drawProp(ctx, Art.bones, px + 16, py + 2, 18, { flip: tx % 2 === 0, alpha: 0.88 });
          } else if (biome === 3 && Art.ice && (tx * 17) % 8 === 0) {
            drawProp(ctx, Art.ice, px + 14, py + 2, 16, { flip: tx % 2 === 0, alpha: 0.9 });
          } else if (biome === 4 && Art.rock && (tx * 17) % 8 === 0) {
            drawProp(ctx, Art.rock, px + 14, py + 2, 14, { flip: tx % 2 === 0, alpha: 0.9 });
          } else if (biome === 0) {
            ctx.fillStyle = p.accent;
            const h = ((tx * 37) % 5) + 2;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(px + ((tx * 13) % 22), py - h, 2, h);
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(px, py, TILE, TILE);
        }
      } else if (tile === PLATFORM) {
        const slabH = 18;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(px + 1, py + slabH - 1, TILE - 2, 4);
        const slab = tilePattern(ctx, platformPlate(biome), slabH, p.groundTop);
        if (slab) {
          ctx.fillStyle = slab;
          ctx.fillRect(px, py, TILE, slabH);
        } else {
          ctx.fillStyle = shade(p.groundTop, -8);
          ctx.fillRect(px, py, TILE, 9);
          ctx.fillStyle = shade(p.ground, -18);
          ctx.fillRect(px, py + 9, TILE, 4);
        }
        ctx.fillStyle = p.moonRim || shade(p.groundTop, 22);
        ctx.globalAlpha = 0.4;
        ctx.fillRect(px, py, TILE, 2);
        ctx.globalAlpha = 1;
      } else if (tile === SPIKE) {
        if (Art.spikes) {
          ctx.save();
          ctx.imageSmoothingEnabled = true;
          if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
          ctx.drawImage(Art.spikes, px, py, TILE, TILE);
          ctx.restore();
        } else {
          ctx.fillStyle = "#cdd3dd";
          for (let i = 0; i < 4; i++) {
            const sx = px + i * 8;
            ctx.beginPath();
            ctx.moveTo(sx, py + TILE);
            ctx.lineTo(sx + 4, py + 6);
            ctx.lineTo(sx + 8, py + TILE);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = "rgba(180,40,50,0.55)";
          ctx.fillRect(px, py + TILE - 4, TILE, 4);
        }
      }
    }
  }

  // Near decor in front of the terrain line
  for (const d of world.decor) {
    if (d.layer !== 1) continue;
    if (d.x < camera.ox - 220 || d.x > camera.ox + W + 220) continue;
    drawDecorItem(ctx, d, p);
  }
}

export function drawCheckpoint(ctx, cp, time) {
  const cx = cp.x + cp.w / 2;
  const baseY = cp.y + cp.h;
  const lit = Boolean(cp.lit);
  const sprite = lit ? Art.firepit || Art.firepitUnlit : Art.firepitUnlit || Art.firepit;
  const height = lit ? 72 : 38;
  ctx.save();
  if (lit) {
    const flick = 0.86 + Math.sin(time * 8 + cp.x) * 0.14;
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, baseY - 22, 4, cx, baseY - 22, 52 * flick);
    g.addColorStop(0, `rgba(255,207,107,${0.22 * flick})`);
    g.addColorStop(0.4, `rgba(224,164,90,${0.1 * flick})`);
    g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, baseY - 22, 52 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  if (!drawProp(ctx, sprite, cx, baseY + 2, height)) {
    ctx.fillStyle = "#2b2118";
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.translate(cx, baseY);
      ctx.rotate(i * 0.45);
      ctx.fillRect(-2.5, -18, 5, 18);
      ctx.restore();
    }
    if (lit) {
      const flick = 0.75 + Math.sin(time * 9 + cp.x) * 0.25;
      ctx.fillStyle = "#ffcf6b";
      ctx.beginPath();
      ctx.moveTo(cx - 8, baseY - 10);
      ctx.quadraticCurveTo(cx - 3, baseY - 26 * flick, cx, baseY - 36 * flick);
      ctx.quadraticCurveTo(cx + 4, baseY - 24 * flick, cx + 8, baseY - 10);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#5a5048";
      ctx.beginPath();
      ctx.arc(cx, baseY - 18, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawChest(ctx, chest, time) {
  const { x, y, w, h } = chest;
  ctx.save();
  if (chest.opened) {
    ctx.globalAlpha = 0.72;
  } else {
    const glow = 0.5 + Math.sin(time * 3 + x) * 0.5;
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, 48);
    g.addColorStop(0, `rgba(200,234,216,${0.16 + glow * 0.12})`);
    g.addColorStop(1, "rgba(200,234,216,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 40, y - 40, w + 80, h + 80);
    ctx.globalCompositeOperation = "source-over";
  }
  if (!drawProp(ctx, Art.chest, x + w / 2, y + h, h + 16, { alpha: chest.opened ? 0.75 : 1 })) {
    ctx.fillStyle = "#5b3a20";
    ctx.fillRect(x, y + 8, w, h - 8);
    ctx.fillStyle = "#7a5029";
    if (chest.opened) {
      ctx.save();
      ctx.translate(x, y + 10);
      ctx.rotate(-0.9);
      ctx.fillRect(0, -10, w, 10);
      ctx.restore();
    } else {
      ctx.fillRect(x, y, w, 11);
    }
    ctx.fillStyle = "#c9a24a";
    ctx.fillRect(x + w / 2 - 3, y + 8, 6, 8);
    ctx.fillStyle = "#3a2415";
    ctx.fillRect(x, y + h - 4, w, 4);
  }
  ctx.restore();
}

export function drawPortal(ctx, exit, time, active) {
  const cx = exit.x + exit.w / 2;
  const cy = exit.y + exit.h / 2;
  const baseY = exit.y + exit.h;
  ctx.save();
  drawProp(ctx, Art.arch, cx, baseY, exit.h + 28, { alpha: active ? 1 : 0.5 });
  ctx.globalCompositeOperation = "lighter";
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  const color = active ? [200, 234, 216] : [120, 90, 110];
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90 * pulse);
  g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${active ? 0.8 : 0.28})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 90 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = active ? "#c8ead8" : "#6b5a68";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const r = 16 + i * 10;
    ctx.globalAlpha = active ? 0.7 - i * 0.18 : 0.28;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.55, r, Math.sin(time * 1.2 + i) * 0.25, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawProjectile(ctx, pr, time) {
  ctx.save();
  const angle = Math.atan2(pr.vy, pr.vx);
  ctx.translate(pr.x, pr.y);

  if (pr.kind === "arrow") {
    ctx.rotate(angle);
    ctx.fillStyle = "#d8c9a0";
    ctx.fillRect(-10, -1.5, 20, 3);
    ctx.fillStyle = "#cfd6e2";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8a5a3a";
    ctx.fillRect(-11, -4, 4, 8);
  } else if (pr.kind === "rock") {
    ctx.fillStyle = "#6b5c4a";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a3f33";
    ctx.beginPath();
    ctx.arc(-2, 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const color = pr.fromPlayer ? "#b06bff" : pr.kind === "shadow" ? "#b06bff" : "#ff9a4d";
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < pr.trail.length; i++) {
      const t = pr.trail[i];
      ctx.globalAlpha = (i / pr.trail.length) * 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(t.x - pr.x, t.y - pr.y, 6 * (i / pr.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPickup(ctx, pk, time) {
  const cx = pk.x + pk.w / 2;
  const cy = pk.y + pk.h / 2 + Math.sin(time * 4 + pk.animTime) * 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const colors = { gold: "#ffcf5f", soul: "#7fd6ff", item: "#c98aff" };
  const color = colors[pk.kind] || "#ffffff";
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 22);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  if (pk.kind === "gold") {
    ctx.rotate(Math.sin(time * 3 + pk.animTime) * 0.5);
    ctx.fillStyle = "#f0b93d";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.ellipse(-1.5, -1.5, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pk.kind === "soul") {
    const wob = Math.sin(time * 6 + pk.animTime) * 1.5;
    ctx.fillStyle = "#9fe6ff";
    ctx.beginPath();
    ctx.moveTo(0, -9 + wob);
    ctx.quadraticCurveTo(7, -2, 4, 5);
    ctx.quadraticCurveTo(0, 9, -4, 5);
    ctx.quadraticCurveTo(-7, -2, 0, -9 + wob);
    ctx.fill();
  } else {
    ctx.rotate(time * 1.6);
    ctx.fillStyle = "#e0c2ff";
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = "#8a4fd8";
    ctx.fillRect(-4, -4, 8, 8);
  }
  ctx.restore();
}

export function drawParticles(ctx, particles) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * 0.9;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
}

export function drawShockwaves(ctx, waves) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const w of waves) {
    const t = 1 - w.life / w.maxLife;
    ctx.globalAlpha = (1 - t) * 0.6;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 6 * (1 - t) + 1;
    ctx.beginPath();
    ctx.ellipse(w.x, w.y, w.r, w.r * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFloaters(ctx, floaters) {
  ctx.save();
  ctx.textAlign = "center";
  for (const f of floaters) {
    const alpha = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${Math.round(15 * f.scale)}px ${UI_SANS}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

export function drawEnemyHealth(ctx, e) {
  if (e.dead || e.isBoss || e.hp >= e.maxHp) return;
  const w = Math.max(28, e.w);
  const x = e.x + e.w / 2 - w / 2;
  const y = e.y - 10;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - 1, y - 1, w + 2, 6);
  ctx.fillStyle = "#8c2f2f";
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = "#e04f4f";
  ctx.fillRect(x, y, w * (e.hp / e.maxHp), 4);
}

export function drawEntities(ctx, game, time) {
  const { world, camera } = game;

  for (const cp of world.checkpointObjs) drawCheckpoint(ctx, cp, time);
  for (const chest of game.chests) drawChest(ctx, chest, time);
  if (game.exitActive !== undefined) drawPortal(ctx, world.exit, time, game.exitActive);

  for (const pk of game.pickups) drawPickup(ctx, pk, time);

  for (const e of game.enemies) {
    if (e.x + e.w < camera.ox - 60 || e.x > camera.ox + camera.viewW + 60) continue;
    drawEnemy(ctx, e, time);
    drawEnemyHealth(ctx, e);
  }

  if (!game.player.dead || game.player.animTime < 2) {
    if (game.player.invuln > 0 && Math.floor(time * 22) % 2 === 0 && game.player.hurtFlash > 0.1) {
      ctx.globalAlpha = 0.55;
    }
    drawKnight(ctx, game.player, game.stats, time);
    ctx.globalAlpha = 1;
    drawSwingArc(ctx, game.player);
  }

  for (const pr of game.projectiles) drawProjectile(ctx, pr, time);
  drawShockwaves(ctx, game.shockwaves);
  drawParticles(ctx, game.particles);
  drawFloaters(ctx, game.floaters);
}

/** Moonlight vignette + a thin warm fill only near the knight. */
export function drawLighting(ctx, game, W, H) {
  const p = game.player;
  const biome = game.level.id;
  const cx = p.x + p.w / 2 - game.camera.ox;
  const cy = p.y + p.h / 2 - game.camera.oy;

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const g = ctx.createRadialGradient(cx, cy, 70, cx, cy, 640);
  g.addColorStop(0, "rgba(255,255,255,1)");
  if (biome === 2) {
    g.addColorStop(0.5, "rgba(214, 186, 198, 1)");
    g.addColorStop(1, "rgba(48, 24, 40, 1)");
  } else if (biome === 3) {
    g.addColorStop(0.5, "rgba(186, 214, 226, 1)");
    g.addColorStop(1, "rgba(52, 78, 96, 1)");
  } else if (biome === 1) {
    g.addColorStop(0.5, "rgba(214, 198, 186, 1)");
    g.addColorStop(1, "rgba(70, 58, 72, 1)");
  } else if (biome === 4) {
    g.addColorStop(0.5, "rgba(200, 194, 214, 1)");
    g.addColorStop(1, "rgba(58, 48, 78, 1)");
  } else {
    g.addColorStop(0.5, "rgba(196, 210, 224, 1)");
    g.addColorStop(1, "rgba(78, 92, 118, 1)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (biome === 2) {
    const crypt = ctx.createRadialGradient(W * 0.5, H * 0.18, 10, W * 0.5, H * 0.18, 380);
    crypt.addColorStop(0, "rgba(196, 90, 138, 0.12)");
    crypt.addColorStop(1, "rgba(196, 90, 138, 0)");
    ctx.fillStyle = crypt;
    ctx.fillRect(0, 0, W, H);
  } else {
    const moonTint = biome === 3
      ? [184, 224, 255, 0.16]
      : biome === 4
        ? [208, 200, 224, 0.12]
        : [200, 234, 216, 0.14];
    const moon = ctx.createRadialGradient(W * 0.74, H * 0.16, 20, W * 0.74, H * 0.16, 420);
    moon.addColorStop(0, `rgba(${moonTint[0]}, ${moonTint[1]}, ${moonTint[2]}, ${moonTint[3]})`);
    moon.addColorStop(1, `rgba(${moonTint[0]}, ${moonTint[1]}, ${moonTint[2]}, 0)`);
    ctx.fillStyle = moon;
    ctx.fillRect(0, 0, W, H);
  }
  const warm = ctx.createRadialGradient(cx, cy, 8, cx, cy, 130);
  warm.addColorStop(0, biome === 2 ? "rgba(255,140,110,0.06)" : "rgba(255,170,90,0.07)");
  warm.addColorStop(1, "rgba(255,140,40,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── HUD ────────────────────────────────────────────────────────────────────

const UI_SANS = '"Source Sans 3", "Segoe UI", system-ui, sans-serif';
const UI_DISPLAY = 'Forum, "Cormorant Garamond", Palatino, serif';

function bar(ctx, x, y, w, h, ratio, color, bg, label) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 4);
  ctx.fill();
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, Math.max(0, w * clamp(ratio, 0, 1)), h, 3);
  ctx.fill();
  if (label) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `600 10px ${UI_SANS}`;
    ctx.textAlign = "left";
    ctx.fillText(label, x + 5, y + h - 3);
  }
}

function abilityIcon(ctx, x, y, size, label, key, ready, cdRatio, color) {
  ctx.save();
  ctx.fillStyle = ready ? "rgba(20,16,26,0.85)" : "rgba(12,10,16,0.85)";
  roundRect(ctx, x, y, size, size, 7);
  ctx.fill();
  ctx.strokeStyle = ready ? color : "rgba(120,110,130,0.5)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 7);
  ctx.stroke();

  ctx.fillStyle = ready ? color : "rgba(150,140,165,0.5)";
  ctx.font = `700 16px ${UI_SANS}`;
  ctx.textAlign = "center";
  ctx.fillText(label, x + size / 2, y + size / 2 + 6);

  if (cdRatio > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(x, y, size, size * cdRatio);
  }

  ctx.fillStyle = "rgba(210,205,220,0.75)";
  ctx.font = `600 9px ${UI_SANS}`;
  ctx.fillText(key, x + size / 2, y + size + 10);
  ctx.restore();
}

export function drawHud(ctx, game, W, H) {
  const p = game.player;
  const s = game.stats;

  ctx.save();
  ctx.textBaseline = "alphabetic";

  // Health / stamina / ward
  const barW = 214;
  bar(ctx, 16, 18, barW, 15, p.hp / s.maxHp, "#d33f4a", "rgba(60,20,24,0.9)", `${Math.ceil(p.hp)} / ${s.maxHp}`);
  if (p.maxWard > 0) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#a878ff";
    roundRect(ctx, 16, 18, barW * clamp(p.ward / s.maxHp, 0, 1), 5, 2);
    ctx.fill();
    ctx.restore();
  }
  bar(ctx, 16, 38, barW * 0.8, 8, p.stamina / s.maxStamina, "#5fbf8a", "rgba(20,44,32,0.9)");

  // Currency
  ctx.textAlign = "right";
  ctx.font = `700 15px ${UI_SANS}`;
  ctx.fillStyle = "#ffcf5f";
  ctx.fillText(`◈ ${formatNum(game.save.gold)}`, W - 18, 30);
  ctx.fillStyle = "#7fd6ff";
  ctx.fillText(`✦ ${formatNum(game.save.souls)}`, W - 18, 51);

  // Level name + progress
  const progress = clamp((p.x / (game.world.pixelWidth - 200)) * 100, 0, 100);
  ctx.textAlign = "center";
  ctx.font = `600 12px ${UI_DISPLAY}`;
  ctx.fillStyle = "rgba(220,214,230,0.7)";
  ctx.fillText(`${game.level.name} — ${progress.toFixed(0)}%`, W / 2, 26);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(W / 2 - 90, 32, 180, 3);
  ctx.fillStyle = game.level.palette.accent;
  ctx.fillRect(W / 2 - 90, 32, 180 * (progress / 100), 3);

  // Abilities (on-screen buttons already show these on a phone)
  if (!document.body.classList.contains("has-touch")) {
    const size = 38;
    const baseY = H - size - 26;
    let ax = 16;
    if (s.canDash) {
      abilityIcon(ctx, ax, baseY, size, "»", "SHIFT", p.dashCharges > 0, p.dashCooldown / (0.85 * s.cooldownMult), "#8fd8ff");
      ax += size + 10;
    }
    if (s.hasRoar) {
      abilityIcon(ctx, ax, baseY, size, "☗", "Q", p.cooldowns.roar === 0, p.cooldowns.roar / (8 * s.cooldownMult), "#ffb066");
      ax += size + 10;
    }
    if (s.hasBolt) {
      abilityIcon(ctx, ax, baseY, size, "✷", "E", p.cooldowns.bolt === 0, p.cooldowns.bolt / (2.6 * s.cooldownMult), "#b06bff");
      ax += size + 10;
    }
    const potionCount = game.potionCount();
    abilityIcon(ctx, ax, baseY, size, `${potionCount}`, "R", potionCount > 0, 0, "#ff7a7a");
  }

  // Boss bar
  const boss = game.enemies.find((e) => e.isBoss && !e.dead && e.aggro);
  if (boss) {
    const bw = Math.min(460, W - 120);
    const bx = W / 2 - bw / 2;
    ctx.textAlign = "center";
    ctx.font = `400 14px ${UI_DISPLAY}`;
    ctx.fillStyle = "#f0e6d0";
    ctx.fillText(boss.type.name.toUpperCase(), W / 2, H - 44);
    bar(ctx, bx, H - 36, bw, 12, boss.hp / boss.maxHp, "#b0303a", "rgba(40,12,16,0.9)");
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 1; i < 3; i++) ctx.fillRect(bx + bw * (i / 3), H - 36, 2, 12);
  }

  // Contextual prompt
  if (game.prompt) {
    ctx.textAlign = "center";
    ctx.font = `600 13px ${UI_SANS}`;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    const tw = ctx.measureText(game.prompt).width + 24;
    roundRect(ctx, W / 2 - tw / 2, H * 0.72, tw, 26, 6);
    ctx.fill();
    ctx.fillStyle = "#ffe6b0";
    ctx.fillText(game.prompt, W / 2, H * 0.72 + 18);
  }

  // Toasts (loot pickups etc.)
  ctx.textAlign = "right";
  let ty = 84;
  for (const toast of game.toasts) {
    ctx.globalAlpha = clamp(toast.life / 0.6, 0, 1);
    ctx.font = `600 13px ${UI_SANS}`;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    const tw = ctx.measureText(toast.text).width + 18;
    roundRect(ctx, W - 18 - tw, ty - 15, tw, 22, 5);
    ctx.fill();
    ctx.fillStyle = toast.color;
    ctx.fillText(toast.text, W - 27, ty);
    ty += 27;
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
