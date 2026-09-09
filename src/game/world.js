import { makeRng, clamp } from "../core/utils.js";

export const TILE = 32;
export const EMPTY = 0;
export const SOLID = 1;
export const PLATFORM = 2;
export const SPIKE = 3;

const LEVEL_HEIGHT = 22;
const BASE_GROUND = 15;
const ARENA_TILES = 30;

function plantDecor(world, rng, groundLine, arenaStart) {
  const add = (tx, kind, opts = {}) => {
    if (tx < 2 || tx >= world.w - 2) return;
    if (groundLine[tx] < 0) return;
    world.decor.push({
      x: tx * TILE + (opts.jitter ?? rng.range(-6, 6)),
      y: groundLine[tx] * TILE,
      kind,
      scale: opts.scale ?? rng.range(0.85, 1.2),
      layer: opts.layer ?? (rng.chance(0.45) ? 0 : 1),
      seed: rng.int(0, 9999),
    });
  };

  const biome = world.cfg.id;
  if (biome === 0) {
    for (let tx = 4; tx < arenaStart; tx += rng.int(3, 7)) {
      add(tx, rng.chance(0.72) ? "tree" : "bush", {
        scale: rng.range(0.9, 1.5),
        layer: rng.chance(0.65) ? 0 : 1,
      });
    }
    for (let tx = 10; tx < arenaStart; tx += rng.int(11, 18)) {
      add(tx, "pillar", { scale: rng.range(0.75, 1.05), layer: 0 });
    }
    for (let tx = 6; tx < arenaStart; tx += rng.int(4, 8)) {
      add(tx, "rock", { scale: rng.range(0.7, 1.15), layer: 1 });
    }
  } else if (biome === 1) {
    for (let tx = 8; tx < arenaStart - 4; tx += rng.int(11, 17)) {
      add(tx, "house", { scale: rng.range(1.05, 1.38), layer: 0, jitter: rng.range(-3, 3) });
      add(tx + 3, "lamp", { scale: rng.range(0.9, 1.12), layer: 1, jitter: 0 });
    }
    for (let tx = 5; tx < arenaStart; tx += rng.int(5, 9)) {
      add(tx, "fence", { scale: rng.range(0.8, 1.15), layer: 1 });
    }
    for (let tx = 14; tx < arenaStart; tx += rng.int(14, 22)) {
      add(tx, "grave", { scale: rng.range(0.85, 1.15), layer: 1 });
    }
  } else if (biome === 2) {
    for (let tx = 4; tx < arenaStart; tx += rng.int(5, 8)) {
      add(tx, rng.chance(0.55) ? "pillar" : "arch", { scale: rng.range(0.95, 1.32), layer: 0 });
    }
    for (let tx = 8; tx < arenaStart; tx += rng.int(7, 12)) {
      add(tx, "window", { scale: rng.range(0.85, 1.18), layer: 0 });
    }
    for (let tx = 5; tx < arenaStart; tx += rng.int(4, 7)) {
      add(tx, rng.chance(0.55) ? "bones" : "grave", { scale: rng.range(0.7, 1.12), layer: 1 });
    }
  } else if (biome === 3) {
    for (let tx = 4; tx < arenaStart; tx += rng.int(4, 8)) {
      add(tx, rng.chance(0.7) ? "ice" : "rock", {
        scale: rng.range(0.85, 1.45),
        layer: rng.chance(0.4) ? 0 : 1,
      });
    }
    for (let tx = 12; tx < arenaStart; tx += rng.int(13, 21)) {
      add(tx, "pillar", { scale: rng.range(0.65, 0.95), layer: 0 });
    }
    for (let tx = 18; tx < arenaStart; tx += rng.int(18, 28)) {
      add(tx, "grave", { layer: 1 });
    }
  } else {
    for (let tx = 4; tx < arenaStart; tx += rng.int(6, 10)) {
      add(tx, rng.chance(0.5) ? "wall" : "spire", { scale: rng.range(1.0, 1.38), layer: 0 });
    }
    for (let tx = 7; tx < arenaStart; tx += rng.int(8, 13)) {
      add(tx, "window", { scale: rng.range(0.9, 1.22), layer: 0 });
    }
    for (let tx = 6; tx < arenaStart; tx += rng.int(7, 12)) {
      add(tx, "lamp", { scale: rng.range(0.9, 1.12), layer: 1, jitter: 0 });
    }
    for (let tx = 14; tx < arenaStart; tx += rng.int(14, 20)) {
      add(tx, "arch", { scale: rng.range(0.95, 1.22), layer: 0 });
    }
  }
}

export class World {
  constructor(levelCfg) {
    this.cfg = levelCfg;
    this.w = levelCfg.width;
    this.h = LEVEL_HEIGHT;
    this.tiles = new Uint8Array(this.w * this.h);
    this.spawn = { x: 3 * TILE, y: (BASE_GROUND - 3) * TILE };
    this.exit = null;
    this.checkpoints = [];
    this.enemySpawns = [];
    this.chestSpawns = [];
    this.decor = [];
    this.bossArenaX = (this.w - ARENA_TILES) * TILE;
    this.generate();
  }

  idx(tx, ty) {
    return ty * this.w + tx;
  }

  get(tx, ty) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return tx < 0 || tx >= this.w ? SOLID : EMPTY;
    return this.tiles[this.idx(tx, ty)];
  }

  set(tx, ty, v) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return;
    this.tiles[this.idx(tx, ty)] = v;
  }

  isSolid(tx, ty) {
    return this.get(tx, ty) === SOLID;
  }

  get pixelWidth() {
    return this.w * TILE;
  }

  get pixelHeight() {
    return this.h * TILE;
  }

  get killY() {
    return this.pixelHeight + 120;
  }

  generate() {
    const rng = makeRng(this.cfg.seed);
    const cfg = this.cfg;
    let ground = BASE_GROUND;
    // Column heightmap: -1 marks a pit the player has to jump across.
    const groundLine = new Int8Array(this.w).fill(BASE_GROUND);

    let x = 0;
    const arenaStart = this.w - ARENA_TILES;
    while (x < this.w) {
      if (x < 8 || x >= arenaStart) {
        groundLine[x] = x >= arenaStart ? BASE_GROUND : ground;
        x++;
        continue;
      }

      // Jump range allows a 3 tile gap comfortably; never generate wider ones.
      if (rng.chance(0.11)) {
        const gap = rng.int(2, 3);
        for (let g = 0; g < gap && x < arenaStart; g++, x++) groundLine[x] = -1;
        continue;
      }

      const run = rng.int(3, 9);
      const step = rng.chance(0.5) ? rng.int(-2, 2) : 0;
      ground = clamp(ground + step, 8, LEVEL_HEIGHT - 4);
      for (let r = 0; r < run && x < arenaStart; r++, x++) groundLine[x] = ground;
    }

    for (let tx = 0; tx < this.w; tx++) {
      const gy = groundLine[tx];
      if (gy < 0) continue;
      for (let ty = gy; ty < this.h; ty++) this.set(tx, ty, SOLID);
    }

    // Ceiling so flyers stay in frame.
    for (let tx = 0; tx < this.w; tx++) this.set(tx, 0, SOLID);

    this.groundLine = groundLine;

    const flatSpots = [];
    for (let tx = 2; tx < this.w - 2; tx++) {
      if (groundLine[tx] > 0 && groundLine[tx - 1] === groundLine[tx] && groundLine[tx + 1] === groundLine[tx]) {
        flatSpots.push(tx);
      }
    }

    // Floating one-way platforms above the ground line.
    const platforms = [];
    for (let tx = 10; tx < arenaStart - 6; tx += rng.int(6, 14)) {
      if (groundLine[tx] < 0) continue;
      const len = rng.int(3, 7);
      const py = clamp(groundLine[tx] - rng.int(3, 6), 3, LEVEL_HEIGHT - 5);
      let ok = true;
      for (let i = 0; i < len; i++) if (this.get(tx + i, py) !== EMPTY) ok = false;
      if (!ok) continue;
      for (let i = 0; i < len; i++) this.set(tx + i, py, PLATFORM);
      platforms.push({ tx, ty: py, len });
    }
    this.platforms = platforms;

    // Spikes on a few flat stretches, always with a jumpable approach.
    const spikeCount = Math.floor(this.w / 45);
    for (let i = 0; i < spikeCount; i++) {
      const tx = rng.pick(flatSpots.filter((t) => t > 14 && t < arenaStart - 8));
      if (tx == null) break;
      const len = rng.int(2, 3);
      for (let k = 0; k < len; k++) {
        if (groundLine[tx + k] === groundLine[tx]) this.set(tx + k, groundLine[tx] - 1, SPIKE);
      }
    }

    // Checkpoint bonfires every ~45 tiles.
    for (let tx = 30; tx < arenaStart - 5; tx += 45) {
      const spot = flatSpots.find((t) => t >= tx && this.get(t, groundLine[t] - 1) === EMPTY);
      if (spot == null) continue;
      this.checkpoints.push({
        x: spot * TILE,
        y: (groundLine[spot] - 2) * TILE,
        w: TILE,
        h: 2 * TILE,
        lit: false,
      });
    }

    // Enemies: spread across the level, never right next to the spawn point.
    const usable = flatSpots.filter((t) => t > 16 && t < arenaStart - 4);
    const weighted = [];
    for (const e of cfg.enemies) for (let i = 0; i < e.weight; i++) weighted.push(e.type);
    for (let i = 0; i < cfg.enemyCount && usable.length; i++) {
      const pos = Math.floor(((i + 0.5) / cfg.enemyCount) * usable.length);
      const tx = usable[clamp(pos + rng.int(-2, 2), 0, usable.length - 1)];
      const type = rng.pick(weighted);
      const isFlyer = type === "bat";
      this.enemySpawns.push({
        type,
        x: tx * TILE,
        y: (groundLine[tx] - (isFlyer ? 5 : 2)) * TILE,
        patrol: rng.int(60, 160),
      });
    }

    // Chests prefer platforms so exploring upward pays off.
    for (let i = 0; i < cfg.chests; i++) {
      const onPlatform = platforms.length && rng.chance(0.7);
      if (onPlatform) {
        const p = rng.pick(platforms);
        this.chestSpawns.push({ x: (p.tx + Math.floor(p.len / 2)) * TILE, y: p.ty * TILE });
      } else if (usable.length) {
        const tx = rng.pick(usable);
        this.chestSpawns.push({ x: tx * TILE, y: groundLine[tx] * TILE });
      }
    }

    // Arena + exit portal.
    this.exit = {
      x: (this.w - 5) * TILE,
      y: (BASE_GROUND - 3) * TILE,
      w: TILE * 2,
      h: TILE * 3,
    };
    this.bossSpawn = cfg.boss
      ? { type: cfg.boss, x: (this.w - 12) * TILE, y: (BASE_GROUND - 4) * TILE }
      : null;

    plantDecor(this, rng, groundLine, arenaStart);
  }

  /** True if the AABB overlaps any spike tile. */
  touchesSpike(box) {
    const x0 = Math.floor(box.x / TILE);
    const x1 = Math.floor((box.x + box.w) / TILE);
    const y0 = Math.floor(box.y / TILE);
    const y1 = Math.floor((box.y + box.h) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.get(tx, ty) === SPIKE) return true;
      }
    }
    return false;
  }

  /** Blocked for line-of-sight / projectile checks. */
  blocksAt(px, py) {
    return this.isSolid(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  /** True if no solid tiles sit on the segment from (x0,y0) to (x1,y1). */
  hasLineOfSight(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 10));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.blocksAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }
}

/**
 * Axis-separated AABB movement against the tile grid.
 * `body` needs x, y, w, h, vx, vy and gets `onGround` / `hitWall` written back.
 */
export function moveBody(body, world, dt) {
  body.hitWall = false;
  const prevBottom = body.y + body.h;

  body.x += body.vx * dt;
  resolveAxis(body, world, "x");

  body.onGround = false;
  body.y += body.vy * dt;
  resolveAxis(body, world, "y", prevBottom);
}

function resolveAxis(body, world, axis, prevBottom = 0) {
  const x0 = Math.floor(body.x / TILE);
  const x1 = Math.floor((body.x + body.w - 0.01) / TILE);
  const y0 = Math.floor(body.y / TILE);
  const y1 = Math.floor((body.y + body.h - 0.01) / TILE);

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = world.get(tx, ty);
      if (tile === EMPTY || tile === SPIKE) continue;

      if (tile === PLATFORM) {
        if (axis !== "y" || body.vy < 0 || body.dropThrough) continue;
        const top = ty * TILE;
        if (prevBottom > top + 2) continue;
        body.y = top - body.h;
        body.vy = 0;
        body.onGround = true;
        continue;
      }

      if (axis === "x") {
        if (body.vx > 0) body.x = tx * TILE - body.w;
        else if (body.vx < 0) body.x = (tx + 1) * TILE;
        body.vx = 0;
        body.hitWall = true;
      } else {
        if (body.vy > 0) {
          body.y = ty * TILE - body.h;
          body.onGround = true;
        } else if (body.vy < 0) {
          body.y = (ty + 1) * TILE;
        }
        body.vy = 0;
      }
    }
  }
}

export class Camera {
  constructor(viewW, viewH) {
    this.x = 0;
    this.y = 0;
    this.viewW = viewW;
    this.viewH = viewH;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  follow(target, world, dt, instant = false) {
    const tx = clamp(target.x + target.w / 2 - this.viewW / 2, 0, Math.max(0, world.pixelWidth - this.viewW));
    const ty = clamp(target.y + target.h / 2 - this.viewH * 0.58, -60, Math.max(0, world.pixelHeight - this.viewH));
    const k = instant ? 1 : 1 - Math.pow(0.0015, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 26);
      this.shakeX = (Math.random() * 2 - 1) * this.shake;
      this.shakeY = (Math.random() * 2 - 1) * this.shake;
    } else {
      this.shakeX = this.shakeY = 0;
    }
  }

  kick(amount) {
    this.shake = Math.min(18, this.shake + amount);
  }

  get ox() {
    return Math.round(this.x + this.shakeX);
  }

  get oy() {
    return Math.round(this.y + this.shakeY);
  }
}
