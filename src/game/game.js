import { clamp } from "../core/utils.js";
import { Sfx } from "../core/audio.js";
import { Telegram } from "../core/telegram.js";
import { SaveStore } from "../core/save.js";
import { World, Camera, TILE } from "./world.js";
import { Player, Enemy, Chest, Checkpoint, makeEnemy, makeParticle, Pickup } from "./entities.js";
import { computeStats } from "./stats.js";
import { getLevel, LEVELS } from "../data/levels.js";
import { POTIONS, getItem, RARITY } from "../data/items.js";
import { rollEnemyDrop, rollChestDrop, addToInventory } from "./loot.js";
import {
  drawBackground,
  drawWeather,
  drawWorld,
  drawEntities,
  drawLighting,
  drawHud,
} from "./render.js";

const MAX_DT = 1 / 30;

export class Game {
  constructor(canvas, save, input, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.save = save;
    this.input = input;
    this.ui = ui;

    this.state = "hub";
    this.time = 0;
    this.hitStopTimer = 0;
    this.viewW = 960;
    this.viewH = 540;
    this.scale = 1;
    this.camera = new Camera(this.viewW, this.viewH);

    this.stats = computeStats(save);
    this.level = getLevel(0);
    this.world = null;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.floaters = [];
    this.shockwaves = [];
    this.chests = [];
    this.toasts = [];
    this.prompt = "";
    this.exitActive = true;
    this.runStats = null;
    this.lastSaveAt = 0;
    this.lastFrame = performance.now();

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.visualViewport?.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pause();
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const aspect = rect.width / rect.height;

    // Keep a readable slice of the world visible on both wide monitors and phones.
    let vw = 960;
    let vh = vw / aspect;
    if (vh > 780) {
      vh = 780;
      vw = vh * aspect;
    }
    if (vw < 560) {
      vw = 560;
      vh = vw / aspect;
    }
    if (vh < 430) {
      vh = 430;
      vw = vh * aspect;
    }
    this.viewW = Math.round(vw);
    this.viewH = Math.round(vh);

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.scale = this.canvas.width / this.viewW;
    if (this.camera) {
      this.camera.viewW = this.viewW;
      this.camera.viewH = this.viewH;
    }
  }

  refreshStats() {
    this.stats = computeStats(this.save);
    if (this.player) this.player.refreshStats(this.stats);
    this.syncTouchButtons();
  }

  /** Hide skill buttons the knight has not unlocked so the pad fits a phone. */
  syncTouchButtons() {
    const stats = this.stats || {};
    for (const el of document.querySelectorAll("[data-unlock]")) {
      const key = el.dataset.unlock;
      el.hidden = !stats[key];
    }
  }

  // ── Level lifecycle ───────────────────────────────────────────────────────

  /** Builds a static, breathing scene used as the backdrop behind the menus. */
  prepareHubScene() {
    this.level = getLevel(0);
    this.world = new World(this.level);
    this.world.checkpointObjs = this.world.checkpoints.map((c) => new Checkpoint(c));
    if (this.world.checkpointObjs[0]) this.world.checkpointObjs[0].lit = true;

    const tx = Math.floor(this.world.spawn.x / TILE);
    const groundY = this.world.groundLine[tx] * TILE;
    this.player = new Player(this.stats, this.world.spawn.x, groundY - 56);
    this.player.onGround = true;
    this.enemies = [];
    this.chests = [];
    this.pickups = [];
    this.projectiles = [];
    this.exitActive = false;
    this.camera.follow(this.player, this.world, 1, true);
  }

  startLevel(levelId) {
    this.level = getLevel(levelId);
    this.stats = computeStats(this.save);
    this.world = new World(this.level);
    this.world.checkpointObjs = this.world.checkpoints.map((c) => new Checkpoint(c));

    this.player = new Player(this.stats, this.world.spawn.x, this.world.spawn.y);
    this.enemies = this.world.enemySpawns.map((s) => makeEnemy(s, this.level));
    if (this.world.bossSpawn) {
      const boss = new Enemy(this.world.bossSpawn.type, this.world.bossSpawn.x, this.world.bossSpawn.y, this.level);
      this.enemies.push(boss);
    }
    this.chests = this.world.chestSpawns.map((c) => new Chest(c.x, c.y));
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.floaters = [];
    this.shockwaves = [];
    this.toasts = [];
    this.exitActive = !this.level.boss;
    this.runStats = { gold: 0, souls: 0, kills: 0, items: [], startedAt: performance.now() };
    this.save.stats.runs += 1;

    this.camera.follow(this.player, this.world, 1, true);
    this.syncTouchButtons();
    this.state = "playing";
    this.input.enabled = true;
    this.input.clear();
    this.ui.hideAll();
    this.ui.showBanner(this.level.name, this.level.subtitle);
    this.saveGame();
  }

  returnToHub(reason = "") {
    this.state = "hub";
    this.input.enabled = false;
    this.input.clear();
    this.refreshStats();
    this.saveGame();
    this.ui.showHub(reason);
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.enabled = false;
    this.input.clear();
    this.ui.showPause();
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.input.enabled = true;
    this.input.clear();
    this.ui.hideAll();
  }

  completeLevel() {
    if (this.state !== "playing") return;
    this.state = "levelComplete";
    this.input.enabled = false;
    Sfx.play("portal");

    const id = this.level.id;
    const firstClear = !this.save.clearedLevels.includes(id);
    if (firstClear) this.save.clearedLevels.push(id);
    if (id + 1 < LEVELS.length) {
      this.save.unlockedLevels = Math.max(this.save.unlockedLevels, id + 2);
    }

    const bonusGold = Math.round(120 * this.level.difficulty * (firstClear ? 2 : 1));
    const bonusSouls = Math.round(8 * this.level.difficulty * (firstClear ? 2.5 : 1));
    this.save.gold += bonusGold;
    this.save.souls += bonusSouls;
    this.saveGame();

    this.ui.showLevelComplete({
      level: this.level,
      firstClear,
      bonusGold,
      bonusSouls,
      run: this.runStats,
      lastLevel: id === LEVELS.length - 1,
    });
  }

  onPlayerDeath() {
    this.state = "dead";
    this.save.stats.deaths += 1;
    const lost = Math.round(this.save.gold * 0.2);
    this.save.gold -= lost;
    this.saveGame();
    const checkpoint = this.world.checkpointObjs.filter((c) => c.lit).pop() || null;
    setTimeout(() => {
      this.input.enabled = false;
      this.ui.showDeath({ lostGold: lost, canRespawn: Boolean(checkpoint), run: this.runStats });
    }, 1100);
  }

  respawnAtCheckpoint() {
    const cp = this.world.checkpointObjs.filter((c) => c.lit).pop();
    if (!cp) {
      this.returnToHub();
      return;
    }
    this.player = new Player(this.stats, cp.x, cp.y - 20);
    for (const e of this.enemies) {
      if (!e.dead) {
        e.hp = e.maxHp;
        e.dropAggro();
      }
    }
    this.projectiles = [];
    this.camera.follow(this.player, this.world, 1, true);
    this.state = "playing";
    this.input.enabled = true;
    this.input.clear();
    this.ui.hideAll();
  }

  // ── Rewards ───────────────────────────────────────────────────────────────

  onEnemyKilled(enemy) {
    this.save.stats.kills += 1;
    if (this.runStats) this.runStats.kills += 1;
    if (enemy.isBoss) {
      this.save.stats.bossKills += 1;
      this.exitActive = true;
      this.camera.kick(16);
      this.ui.showBanner(`${enemy.type.name} повержен`, "Портал открыт");
      Sfx.play("levelup");
    }

    const drop = rollEnemyDrop(enemy.type, this.level, this.stats);
    const cx = enemy.centerX;
    const cy = enemy.centerY;

    const coins = clamp(Math.round(drop.gold / 12), 1, 8);
    for (let i = 0; i < coins; i++) {
      this.pickups.push(new Pickup(cx, cy, "gold", Math.ceil(drop.gold / coins)));
    }
    const souls = clamp(Math.round(drop.souls / 2), 1, 6);
    for (let i = 0; i < souls; i++) {
      this.pickups.push(new Pickup(cx, cy, "soul", Math.ceil(drop.souls / souls)));
    }
    for (const itemId of drop.items) {
      this.pickups.push(new Pickup(cx, cy - 10, "item", itemId));
    }
    this.burst(cx, cy, enemy.isBoss ? 40 : 14, enemy.type.colors.eye, enemy.isBoss ? 260 : 140);
  }

  openChest(chest) {
    chest.opened = true;
    Sfx.play("loot");
    const drop = rollChestDrop(this.level, this.stats);
    const cx = chest.x + chest.w / 2;
    const cy = chest.y;
    for (let i = 0; i < 6; i++) this.pickups.push(new Pickup(cx, cy, "gold", Math.ceil(drop.gold / 6)));
    for (let i = 0; i < 3; i++) this.pickups.push(new Pickup(cx, cy, "soul", Math.ceil(drop.souls / 3)));
    for (const itemId of drop.items) this.pickups.push(new Pickup(cx, cy - 8, "item", itemId));
    this.burst(cx, cy, 24, "#ffcf5f", 180);
  }

  collect(pickup) {
    if (pickup.kind === "gold") {
      this.save.gold += pickup.payload;
      if (this.runStats) this.runStats.gold += pickup.payload;
      Sfx.play("coin");
    } else if (pickup.kind === "soul") {
      this.save.souls += pickup.payload;
      if (this.runStats) this.runStats.souls += pickup.payload;
      Sfx.play("soul");
    } else {
      const item = getItem(pickup.payload);
      if (!item) return;
      addToInventory(this.save, item.id);
      if (this.runStats) this.runStats.items.push(item.id);
      Sfx.play("loot");
      Telegram.haptic("success");
      this.addToast(`${item.name}`, RARITY[item.rarity].color);
      this.burst(pickup.x, pickup.y, 18, RARITY[item.rarity].color, 160);
    }
  }

  usePotion() {
    const order = ["minor-elixir", "greater-elixir", "soul-tincture"];
    const id = order.find((k) => (this.save.potions[k] || 0) > 0);
    if (!id || this.player.hp >= this.stats.maxHp) {
      Sfx.play("deny");
      return;
    }
    const potion = POTIONS[id];
    this.save.potions[id] -= 1;
    this.player.hp = Math.min(this.stats.maxHp, this.player.hp + potion.heal);
    if (potion.souls) this.save.souls += potion.souls;
    Sfx.play("potion");
    this.addFloater(this.player.x + this.player.w / 2, this.player.y, `+${potion.heal}`, "#6be07a");
    this.burst(this.player.x + this.player.w / 2, this.player.y + 30, 14, "#6be07a", 120);
  }

  potionCount() {
    return Object.values(this.save.potions).reduce((a, b) => a + b, 0);
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  burst(x, y, count, color, speed) {
    for (let i = 0; i < count; i++) this.particles.push(makeParticle(x, y, color, speed));
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  addFloater(x, y, text, color, scale = 1) {
    this.floaters.push({ x, y, text, color, scale, life: 0.9, maxLife: 0.9, vy: -46 });
  }

  addToast(text, color = "#ffffff") {
    this.toasts.unshift({ text, color, life: 3 });
    if (this.toasts.length > 4) this.toasts.pop();
  }

  hitStop(seconds) {
    this.hitStopTimer = Math.max(this.hitStopTimer, seconds);
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  saveGame() {
    this.save.settings.muted = Sfx.muted;
    SaveStore.save(this.save);
    this.lastSaveAt = this.time;
    this.ui.refreshHeader();
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    this.time += dt;
    if (this.state !== "playing" && this.state !== "dead") {
      if (this.player) this.player.animTime += dt;
      return;
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      dt *= 0.12;
    }

    const player = this.player;
    player.update(dt, this.input, this);

    for (const e of this.enemies) e.update(dt, this);
    this.enemies = this.enemies.filter((e) => !(e.dead && e.deathTimer > 1.4));

    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    for (const pk of this.pickups) pk.update(dt, this);
    this.pickups = this.pickups.filter((p) => !p.dead);

    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const f of this.floaters) {
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 0.94;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);

    for (const w of this.shockwaves) {
      w.maxLife = w.maxLife || w.life;
      w.life -= dt;
      w.r += ((w.max - w.r) * dt) / 0.18;
    }
    this.shockwaves = this.shockwaves.filter((w) => w.life > 0);

    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter((t) => t.life > 0);

    this.updateInteractions();

    this.camera.follow(player, this.world, dt);

    this.save.stats.playtimeMs += dt * 1000;
    if (this.state === "playing" && this.time - this.lastSaveAt > 45) this.saveGame();

    if (this.input.justPressed("menu")) this.pause();
  }

  updateInteractions() {
    const player = this.player;
    this.prompt = "";
    if (player.dead) return;

    // Bonfires
    for (const cp of this.world.checkpointObjs) {
      cp.animTime += 0.016;
      const near = Math.abs(player.x + player.w / 2 - (cp.x + cp.w / 2)) < 46 &&
        Math.abs(player.y + player.h - (cp.y + cp.h)) < 70;
      if (!near) continue;
      if (!cp.lit) {
        cp.lit = true;
        player.hp = Math.min(this.stats.maxHp, player.hp + this.stats.maxHp * 0.45);
        player.stamina = this.stats.maxStamina;
        Sfx.play("levelup");
        this.addToast("Костёр зажжён — прогресс сохранён", "#ffbe6e");
        this.burst(cp.x + cp.w / 2, cp.y + cp.h - 10, 26, "#ffbe6e", 180);
        this.saveGame();
      }
    }

    // Chests
    for (const chest of this.chests) {
      if (chest.opened) continue;
      const near =
        Math.abs(player.x + player.w / 2 - (chest.x + chest.w / 2)) < 48 &&
        Math.abs(player.y + player.h - (chest.y + chest.h)) < 60;
      if (!near) continue;
      this.prompt = "F — открыть сундук";
      if (this.input.justPressed("interact")) this.openChest(chest);
    }

    // Exit portal
    const exit = this.world.exit;
    const nearExit =
      player.x + player.w > exit.x - 20 &&
      player.x < exit.x + exit.w + 20 &&
      player.y + player.h > exit.y - 20;
    if (nearExit) {
      if (this.exitActive) {
        this.prompt = "F — покинуть уровень";
        if (this.input.justPressed("interact")) this.completeLevel();
      } else {
        this.prompt = "Портал запечатан — сразите босса";
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const W = this.viewW;
    const H = this.viewH;

    if (!this.world) {
      ctx.fillStyle = "#0b0710";
      ctx.fillRect(0, 0, W, H);
      return;
    }

    drawBackground(ctx, this.world, this.camera, this.time, W, H);
    drawWeather(ctx, this.world, this.camera, this.time, W, H);

    ctx.save();
    ctx.translate(-this.camera.ox, -this.camera.oy);
    drawWorld(ctx, this.world, this.camera, this.time, W, H);
    drawEntities(ctx, this, this.time);
    ctx.restore();

    drawLighting(ctx, this, W, H);
    if (this.state === "playing" || this.state === "paused" || this.state === "dead") {
      drawHud(ctx, this, W, H);
    }

    if (this.state === "dead") {
      ctx.fillStyle = `rgba(20,0,6,${clamp(this.player.animTime * 0.5, 0, 0.65)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  loop = (timestamp) => {
    const raw = (timestamp - this.lastFrame) / 1000;
    this.lastFrame = timestamp;
    const dt = Math.min(raw, MAX_DT);

    this.update(dt);
    this.render();
    this.input.endFrame();

    requestAnimationFrame(this.loop);
  };

  start() {
    this.resize();
    this.lastFrame = performance.now();
    requestAnimationFrame(this.loop);
  }
}
