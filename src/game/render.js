import { TILE, SOLID, PLATFORM, SPIKE } from "./world.js";
import { drawKnight, drawSwingArc, drawEnemy } from "./sprites.js";
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
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, p.sky[0]);
  sky.addColorStop(0.55, p.sky[1]);
  sky.addColorStop(1, p.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.save();
  for (const s of stars(world.cfg.seed, 90, W, H)) {
    const twinkle = 0.35 + Math.abs(Math.sin(time * 1.6 + s.tw)) * 0.65;
    ctx.globalAlpha = twinkle * 0.7;
    ctx.fillStyle = "#dfe6ff";
    ctx.fillRect(s.x - camera.x * 0.02, s.y, s.r, s.r);
  }
  ctx.restore();

  // Moon
  const moonX = W * 0.78 - camera.x * 0.03;
  const moonY = H * 0.2;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = p.moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = shade(p.sky[1], 6);
  ctx.beginPath();
  ctx.arc(moonX - 13, moonY - 8, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ridge(ctx, camera.x, 0.08, H * 0.72, 120, 46, p.far, world.cfg.seed + 11, W, H);
  ridge(ctx, camera.x, 0.18, H * 0.86, 90, 34, p.mid, world.cfg.seed + 22, W, H);
  ridge(ctx, camera.x, 0.32, H * 1.0, 70, 26, p.near, world.cfg.seed + 33, W, H);

  ctx.fillStyle = p.fog;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
}

/** Ambient motes: ash, spores or embers depending on the biome accent colour. */
export function drawWeather(ctx, world, camera, time, W, H) {
  const rng = makeRng(world.cfg.seed + 99);
  ctx.save();
  ctx.fillStyle = world.cfg.palette.accent;
  for (let i = 0; i < 60; i++) {
    const seedX = rng() * 2000;
    const speed = 12 + rng() * 26;
    const drift = rng() * 60;
    const size = 1 + rng() * 2;
    const x = ((seedX - camera.x * 0.35 + Math.sin(time * 0.5 + i) * drift) % (W + 60) + W + 60) % (W + 60) - 30;
    const y = ((rng() * H + time * speed) % (H + 40)) - 20;
    ctx.globalAlpha = 0.12 + (i % 5) * 0.03;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function drawDecorItem(ctx, d, palette) {
  const rng = makeRng(d.seed);
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(d.scale, d.scale);
  const dark = d.layer === 0 ? -45 : -20;

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
  } else if (d.kind === "pillar") {
    ctx.fillStyle = shade(palette.ground, dark + 12);
    ctx.fillRect(-11, -84, 22, 84);
    ctx.fillStyle = shade(palette.ground, dark - 8);
    for (let i = 0; i < 5; i++) ctx.fillRect(-11, -80 + i * 17, 22, 3);
    ctx.fillStyle = shade(palette.ground, dark + 20);
    ctx.fillRect(-15, -90, 30, 8);
  } else if (d.kind === "grave") {
    ctx.fillStyle = shade(palette.ground, dark + 16);
    roundRect(ctx, -10, -30, 20, 30, 9);
    ctx.fill();
    ctx.fillStyle = shade(palette.ground, dark - 10);
    ctx.fillRect(-5, -22, 10, 3);
    ctx.fillRect(-2, -26, 4, 14);
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
  const x0 = Math.max(0, Math.floor(camera.ox / TILE) - 1);
  const x1 = Math.min(world.w - 1, Math.ceil((camera.ox + W) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(camera.oy / TILE) - 1);
  const y1 = Math.min(world.h - 1, Math.ceil((camera.oy + H) / TILE) + 1);

  // Far decor behind the terrain
  for (const d of world.decor) {
    if (d.layer !== 0) continue;
    if (d.x < camera.ox - 120 || d.x > camera.ox + W + 120) continue;
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
        ctx.fillStyle = p.ground;
        ctx.fillRect(px, py, TILE, TILE);
        if (isTop) {
          ctx.fillStyle = p.groundTop;
          ctx.fillRect(px, py, TILE, 7);
          ctx.fillStyle = shade(p.groundTop, -25);
          ctx.fillRect(px, py + 7, TILE, 3);
          // tufts / rubble on the surface
          ctx.fillStyle = p.accent;
          const h = ((tx * 37) % 5) + 2;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(px + ((tx * 13) % 22), py - h, 2, h);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = shade(p.ground, -12);
          ctx.fillRect(px + ((tx * 7) % 12), py + ((ty * 11) % 14), 5, 4);
        }
        ctx.strokeStyle = "rgba(0,0,0,0.22)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      } else if (tile === PLATFORM) {
        ctx.fillStyle = shade(p.groundTop, -8);
        ctx.fillRect(px, py, TILE, 9);
        ctx.fillStyle = shade(p.ground, -18);
        ctx.fillRect(px, py + 9, TILE, 4);
        ctx.fillStyle = shade(p.groundTop, 22);
        ctx.fillRect(px, py, TILE, 2);
      } else if (tile === SPIKE) {
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

  // Near decor in front of the terrain line
  for (const d of world.decor) {
    if (d.layer !== 1) continue;
    if (d.x < camera.ox - 120 || d.x > camera.ox + W + 120) continue;
    drawDecorItem(ctx, d, p);
  }
}

export function drawCheckpoint(ctx, cp, time) {
  const cx = cp.x + cp.w / 2;
  const baseY = cp.y + cp.h;
  ctx.save();
  ctx.fillStyle = "#2b2118";
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.rotate(i * 0.45);
    ctx.fillRect(-2.5, -18, 5, 18);
    ctx.restore();
  }
  if (cp.lit) {
    const flick = 0.75 + Math.sin(time * 9 + cp.x) * 0.25;
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, baseY - 22, 2, cx, baseY - 22, 70 * flick);
    g.addColorStop(0, "rgba(255,190,110,0.85)");
    g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, baseY - 22, 70 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcf6b";
    ctx.beginPath();
    ctx.moveTo(cx - 8, baseY - 14);
    ctx.quadraticCurveTo(cx - 3, baseY - 30 * flick, cx, baseY - 40 * flick);
    ctx.quadraticCurveTo(cx + 4, baseY - 28 * flick, cx + 8, baseY - 14);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#5a5048";
    ctx.beginPath();
    ctx.arc(cx, baseY - 18, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawChest(ctx, chest, time) {
  const { x, y, w, h } = chest;
  ctx.save();
  if (chest.opened) {
    ctx.globalAlpha = 0.75;
  } else {
    const glow = 0.5 + Math.sin(time * 3 + x) * 0.5;
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, 48);
    g.addColorStop(0, `rgba(255,210,120,${0.22 + glow * 0.16})`);
    g.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 40, y - 40, w + 80, h + 80);
    ctx.globalCompositeOperation = "source-over";
  }
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
  ctx.restore();
}

export function drawPortal(ctx, exit, time, active) {
  const cx = exit.x + exit.w / 2;
  const cy = exit.y + exit.h / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  const color = active ? [140, 220, 255] : [120, 90, 110];
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90 * pulse);
  g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${active ? 0.85 : 0.3})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 90 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = active ? "#9fe3ff" : "#6b5a68";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const r = 16 + i * 10;
    ctx.globalAlpha = active ? 0.8 - i * 0.2 : 0.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.7, r, Math.sin(time * 1.2 + i) * 0.3, 0, Math.PI * 2);
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
    ctx.font = `700 ${Math.round(15 * f.scale)}px "Segoe UI", system-ui, sans-serif`;
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

/** Dark vignette + torchlight around the knight, drawn in screen space. */
export function drawLighting(ctx, game, W, H) {
  const p = game.player;
  const cx = p.x + p.w / 2 - game.camera.ox;
  const cy = p.y + p.h / 2 - game.camera.oy;

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, 620);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(208,200,218,1)");
  g.addColorStop(1, "rgba(108,98,128,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const warm = ctx.createRadialGradient(cx, cy, 10, cx, cy, 170);
  warm.addColorStop(0, "rgba(255,170,90,0.16)");
  warm.addColorStop(1, "rgba(255,140,40,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── HUD ────────────────────────────────────────────────────────────────────

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
    ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
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
  ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(label, x + size / 2, y + size / 2 + 6);

  if (cdRatio > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(x, y, size, size * cdRatio);
  }

  ctx.fillStyle = "rgba(210,205,220,0.75)";
  ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
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
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = "#ffcf5f";
  ctx.fillText(`◈ ${formatNum(game.save.gold)}`, W - 18, 30);
  ctx.fillStyle = "#7fd6ff";
  ctx.fillText(`✦ ${formatNum(game.save.souls)}`, W - 18, 51);

  // Level name + progress
  const progress = clamp((p.x / (game.world.pixelWidth - 200)) * 100, 0, 100);
  ctx.textAlign = "center";
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = "rgba(220,214,230,0.7)";
  ctx.fillText(`${game.level.name} — ${progress.toFixed(0)}%`, W / 2, 26);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(W / 2 - 90, 32, 180, 3);
  ctx.fillStyle = game.level.palette.accent;
  ctx.fillRect(W / 2 - 90, 32, 180 * (progress / 100), 3);

  // Abilities
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

  // Boss bar
  const boss = game.enemies.find((e) => e.isBoss && !e.dead && e.aggro);
  if (boss) {
    const bw = Math.min(460, W - 120);
    const bx = W / 2 - bw / 2;
    ctx.textAlign = "center";
    ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#f0e6d0";
    ctx.fillText(boss.type.name.toUpperCase(), W / 2, H - 44);
    bar(ctx, bx, H - 36, bw, 12, boss.hp / boss.maxHp, "#b0303a", "rgba(40,12,16,0.9)");
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 1; i < 3; i++) ctx.fillRect(bx + bw * (i / 3), H - 36, 2, 12);
  }

  // Contextual prompt
  if (game.prompt) {
    ctx.textAlign = "center";
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
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
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
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
