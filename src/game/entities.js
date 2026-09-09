import { clamp, rand, randInt, aabb, pick } from "../core/utils.js";
import { moveBody, TILE } from "./world.js";
import { ENEMY_TYPES } from "../data/enemies.js";
import { Sfx } from "../core/audio.js";

export const GRAVITY = 2000;
const MAX_FALL = 980;
const JUMP_VEL = 640;
const COYOTE = 0.1;
const JUMP_BUFFER = 0.12;

const WEAPON_SHAPES = {
  dagger: { reach: 44, height: 34, light: 0.34, heavy: 0.58, knock: 130 },
  sword: { reach: 56, height: 42, light: 0.4, heavy: 0.66, knock: 190 },
  axe: { reach: 62, height: 48, light: 0.5, heavy: 0.8, knock: 260 },
  hammer: { reach: 66, height: 54, light: 0.58, heavy: 0.92, knock: 340 },
};

const STAMINA_COST = { light: 11, heavy: 24, dash: 20 };

export class Player {
  constructor(stats, x, y) {
    this.w = 30;
    this.h = 52;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.dropThrough = false;

    this.stats = stats;
    this.hp = stats.maxHp;
    this.stamina = stats.maxStamina;
    this.ward = stats.maxHp * stats.wardPct;
    this.maxWard = stats.maxHp * stats.wardPct;
    this.wardTimer = 0;

    this.state = "idle";
    this.animTime = 0;
    this.attackTimer = 0;
    this.attackDuration = 0;
    this.attackKind = "light";
    this.attackCombo = 0;
    this.comboWindow = 0;
    this.hitSet = new Set();

    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashCharges = stats.dashCharges;
    this.dashHitSet = new Set();

    this.jumpsLeft = stats.maxJumps || 2;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.staminaDelay = 0;
    this.cooldowns = { roar: 0, bolt: 0 };
    this.dead = false;
    this.lastSafe = { x, y };
    this.safeTimer = 0;
  }

  get maxHp() {
    return this.stats.maxHp;
  }

  refreshStats(stats) {
    const hpRatio = this.hp / this.maxHp;
    this.stats = stats;
    this.hp = clamp(stats.maxHp * hpRatio, 1, stats.maxHp);
    this.maxWard = stats.maxHp * stats.wardPct;
    this.ward = Math.min(this.ward, this.maxWard);
    this.dashCharges = Math.min(this.dashCharges, stats.dashCharges);
  }

  get weaponShape() {
    return WEAPON_SHAPES[this.stats.weaponKind] || WEAPON_SHAPES.sword;
  }

  update(dt, input, game) {
    if (this.dead) {
      this.animTime += dt;
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      moveBody(this, game.world, dt);
      return;
    }

    const s = this.stats;
    this.animTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    for (const key of Object.keys(this.cooldowns)) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    }

    if (this.dashCooldown === 0 && this.dashCharges < s.dashCharges) {
      this.dashCharges = s.dashCharges;
    }

    // Ward regenerates only after staying unharmed for a while.
    if (this.maxWard > 0) {
      this.wardTimer += dt;
      if (this.wardTimer > 12) this.ward = Math.min(this.maxWard, this.ward + this.maxWard * dt * 0.5);
    }

    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (this.staminaDelay === 0 && this.stamina < s.maxStamina) {
      this.stamina = Math.min(s.maxStamina, this.stamina + 30 * s.staminaRegenMult * dt);
    }

    const attacking = this.attackTimer > 0;
    const dashing = this.dashTimer > 0;

    // ── Horizontal movement ────────────────────────────────────────────────
    let dir = 0;
    if (input.isDown("left")) dir -= 1;
    if (input.isDown("right")) dir += 1;
    if (dir !== 0 && !dashing && !attacking) this.facing = dir;

    if (dashing) {
      this.dashTimer -= dt;
      this.vx = this.facing * 620;
      if (s.dashDamage > 0) this.applyDashDamage(game);
      if (this.dashTimer <= 0) {
        this.vx *= 0.35;
        this.dashHitSet.clear();
      }
    } else {
      const target = dir * s.moveSpeed * (attacking ? 0.35 : 1);
      const accel = this.onGround ? 2600 : 1500;
      this.vx += clamp(target - this.vx, -accel * dt, accel * dt);
      if (dir === 0) this.vx *= this.onGround ? 0.72 : 0.94;
    }

    // ── Jumping ────────────────────────────────────────────────────────────
    if (input.justPressed("jump")) this.jumpBuffer = JUMP_BUFFER;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    const maxJumps = s.maxJumps || 2;
    if (this.onGround) this.jumpsLeft = maxJumps;

    const canGroundJump = this.coyote > 0;
    const canAirJump = !this.onGround && this.coyote <= 0 && this.jumpsLeft > 0;
    if (this.jumpBuffer > 0 && (canGroundJump || canAirJump) && !dashing) {
      const airJump = canAirJump;
      this.vy = -JUMP_VEL * (airJump ? 0.92 : 1);
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.jumpsLeft = Math.max(0, this.jumpsLeft - 1);
      this.onGround = false;
      Sfx.play("jump");
      if (airJump) game.burst(this.x + this.w / 2, this.y + this.h, 8, "#8fd8ff", 90);
      if (input.isDown("down")) {
        this.dropThrough = true;
        this.vy = 120;
      }
    }
    if (input.justReleased("jump") && this.vy < -180) this.vy *= 0.45;

    if (this.onGround || !input.isDown("down")) this.dropThrough = false;

    // ── Actions ────────────────────────────────────────────────────────────
    if (input.justPressed("dash") && s.canDash && !dashing) this.tryDash(game);
    if (input.justPressed("attack") && !dashing) this.tryAttack(game, "light");
    if (input.justPressed("heavy") && !dashing) this.tryAttack(game, "heavy");
    if (input.justPressed("roar") && s.hasRoar) this.tryRoar(game);
    if (input.justPressed("bolt") && s.hasBolt) this.tryBolt(game);
    if (input.justPressed("potion")) game.usePotion();

    // ── Attack resolution ──────────────────────────────────────────────────
    if (attacking) {
      this.attackTimer -= dt;
      const progress = 1 - this.attackTimer / this.attackDuration;
      if (progress > 0.28 && progress < 0.7) this.applyAttackDamage(game);
      if (this.attackTimer <= 0) {
        this.hitSet.clear();
        this.comboWindow = 0.42;
      }
    }

    // ── Physics ────────────────────────────────────────────────────────────
    if (!dashing) this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    else this.vy = 0;

    moveBody(this, game.world, dt);

    // Track the last safe footing so pits can teleport the player back.
    this.safeTimer += dt;
    if (this.onGround && this.safeTimer > 0.25 && !game.world.touchesSpike(this)) {
      this.safeTimer = 0;
      this.lastSafe = { x: this.x, y: this.y };
    }

    if (game.world.touchesSpike(this) && this.invuln <= 0) {
      this.takeDamage(Math.max(8, this.maxHp * 0.08), game, { x: this.x, y: this.y }, true);
    }

    if (this.y > game.world.killY) {
      this.x = this.lastSafe.x;
      this.y = this.lastSafe.y - 8;
      this.vx = this.vy = 0;
      this.takeDamage(this.maxHp * 0.15, game, null, true);
      game.camera.kick(10);
    }

    this.x = clamp(this.x, 0, game.world.pixelWidth - this.w);

    // ── Animation state ────────────────────────────────────────────────────
    if (this.attackTimer > 0) this.state = this.attackKind === "heavy" ? "heavy" : "attack";
    else if (this.dashTimer > 0) this.state = "dash";
    else if (!this.onGround) this.state = this.vy < 0 ? "jump" : "fall";
    else if (Math.abs(this.vx) > 30) this.state = "run";
    else this.state = "idle";
  }

  tryDash(game) {
    const s = this.stats;
    if (this.dashCharges <= 0) return;
    if (!this.onGround && !s.canAirDash) return;
    if (this.stamina < STAMINA_COST.dash) return;
    this.stamina -= STAMINA_COST.dash;
    this.staminaDelay = 0.45;
    this.dashCharges -= 1;
    this.dashTimer = 0.18;
    this.dashCooldown = 0.85 * s.cooldownMult;
    this.invuln = Math.max(this.invuln, 0.26);
    this.dashHitSet.clear();
    Sfx.play("dash");
    game.burst(this.x + this.w / 2, this.y + this.h * 0.6, 12, "#a9d8ff", 120);
  }

  tryAttack(game, kind) {
    if (this.attackTimer > 0) return;
    const cost = STAMINA_COST[kind];
    if (this.stamina < cost) {
      Sfx.play("deny");
      return;
    }
    const shape = this.weaponShape;
    const speed = this.stats.attackSpeed;
    this.attackKind = kind;
    this.attackDuration = (kind === "heavy" ? shape.heavy : shape.light) / speed;
    this.attackTimer = this.attackDuration;
    this.attackCombo = this.comboWindow > 0 ? (this.attackCombo + 1) % 3 : 0;
    this.stamina -= cost;
    this.staminaDelay = 0.4;
    this.hitSet.clear();
    Sfx.play(kind === "heavy" ? "heavy" : "swing");
    if (kind === "heavy") this.vx += this.facing * 90;
  }

  attackBox() {
    const shape = this.weaponShape;
    const reach = shape.reach * (this.attackKind === "heavy" ? 1.2 : 1);
    return {
      x: this.facing > 0 ? this.x + this.w - 6 : this.x - reach + 6,
      y: this.y + this.h * 0.18,
      w: reach,
      h: shape.height,
    };
  }

  rollDamage(base) {
    const s = this.stats;
    let dmg = base * s.damageMult;
    if (this.hp / this.maxHp < 0.35) dmg *= 1 + s.rageDamage;
    const crit = Math.random() * 100 < s.crit;
    if (crit) dmg *= s.critDmg / 100;
    return { damage: Math.round(dmg), crit };
  }

  applyAttackDamage(game) {
    const box = this.attackBox();
    const shape = this.weaponShape;
    const mult = this.attackKind === "heavy" ? 1.85 : 1 + this.attackCombo * 0.12;
    for (const enemy of game.enemies) {
      if (enemy.dead || this.hitSet.has(enemy.id) || !aabb(box, enemy)) continue;
      this.hitSet.add(enemy.id);
      const { damage, crit } = this.rollDamage(this.stats.damage * mult);
      enemy.hurt(damage, game, {
        knockX: this.facing * shape.knock * (this.attackKind === "heavy" ? 1.6 : 1),
        knockY: this.attackKind === "heavy" ? -180 : -90,
        crit,
      });
      this.healFromLifesteal(damage, game);
      game.camera.kick(crit ? 7 : 3.5);
      game.hitStop(crit ? 0.075 : 0.04);
    }
  }

  applyDashDamage(game) {
    for (const enemy of game.enemies) {
      if (enemy.dead || this.dashHitSet.has(enemy.id) || !aabb(this, enemy)) continue;
      this.dashHitSet.add(enemy.id);
      const { damage, crit } = this.rollDamage(this.stats.damage * this.stats.dashDamage);
      enemy.hurt(damage, game, { knockX: this.facing * 200, knockY: -140, crit });
      this.healFromLifesteal(damage, game);
      game.camera.kick(4);
    }
  }

  healFromLifesteal(damage, game) {
    let pct = this.stats.lifesteal;
    if (this.hp / this.maxHp < 0.35) pct += this.stats.rageLifesteal;
    if (pct <= 0) return;
    const heal = (damage * pct) / 100;
    if (heal < 0.1) return;
    this.hp = Math.min(this.maxHp, this.hp + heal);
    if (Math.random() < 0.35) game.burst(this.x + this.w / 2, this.y + 20, 3, "#ff5f7a", 60);
  }

  tryRoar(game) {
    if (this.cooldowns.roar > 0 || this.stamina < 25) return;
    this.cooldowns.roar = 8 * this.stats.cooldownMult;
    this.stamina -= 25;
    this.staminaDelay = 0.5;
    Sfx.play("roar");
    game.camera.kick(12);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    game.shockwaves.push({ x: cx, y: cy, r: 10, max: 210, life: 0.5, color: "#ffb066" });
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x + enemy.w / 2 - cx;
      const dy = enemy.y + enemy.h / 2 - cy;
      if (Math.hypot(dx, dy) > 210) continue;
      const dmg = Math.round((30 + this.stats.damage * 0.5) * (1 + this.stats.abilityPower));
      enemy.hurt(dmg, game, { knockX: Math.sign(dx) * 380, knockY: -240, stun: 1.6 });
    }
    game.burst(cx, cy, 26, "#ffb066", 220);
  }

  tryBolt(game) {
    if (this.cooldowns.bolt > 0) return;
    this.cooldowns.bolt = 2.6 * this.stats.cooldownMult;
    Sfx.play("bolt");
    const dmg = Math.round(this.stats.boltDamage * (1 + this.stats.abilityPower));
    game.projectiles.push(
      new Projectile({
        x: this.x + this.w / 2 + this.facing * 18,
        y: this.y + this.h * 0.42,
        vx: this.facing * 520,
        vy: 0,
        damage: dmg,
        kind: "shadow",
        fromPlayer: true,
        pierce: 2,
      })
    );
  }

  takeDamage(amount, game, source, ignoreArmor = false) {
    if (this.invuln > 0 || this.dead) return;
    const s = this.stats;
    let dmg = amount;
    if (!ignoreArmor) dmg = amount * (1 - s.armor / (s.armor + 90));
    dmg = Math.max(1, Math.round(dmg));

    if (this.ward > 0) {
      const absorbed = Math.min(this.ward, dmg);
      this.ward -= absorbed;
      dmg -= absorbed;
      game.burst(this.x + this.w / 2, this.y + this.h / 2, 10, "#9a6ef0", 130);
    }
    this.wardTimer = 0;

    if (dmg > 0) {
      this.hp -= dmg;
      game.addFloater(this.x + this.w / 2, this.y, `-${dmg}`, "#ff6b6b");
    }

    this.invuln = 0.8;
    this.hurtFlash = 1;
    this.attackTimer = 0;
    Sfx.play("hurt");
    game.camera.kick(8);
    game.hitStop(0.06);

    if (source) {
      const dir = Math.sign(this.x + this.w / 2 - (source.x + (source.w || 0) / 2)) || 1;
      this.vx = dir * 240;
      this.vy = -220;
    }

    if (s.hasNova) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      game.shockwaves.push({ x: cx, y: cy, r: 8, max: 170, life: 0.4, color: "#b06bff" });
      for (const enemy of game.enemies) {
        if (enemy.dead) continue;
        const d = Math.hypot(enemy.x + enemy.w / 2 - cx, enemy.y + enemy.h / 2 - cy);
        if (d < 170) {
          enemy.hurt(Math.round(28 * (1 + s.abilityPower)), game, {
            knockX: Math.sign(enemy.x - cx) * 260,
            knockY: -160,
          });
        }
      }
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.state = "dead";
      this.animTime = 0;
      Sfx.play("death");
      game.onPlayerDeath();
    }
  }
}

let enemyIdCounter = 0;

export class Enemy {
  constructor(typeId, x, y, level) {
    const type = ENEMY_TYPES[typeId];
    this.id = ++enemyIdCounter;
    this.type = type;
    this.typeId = typeId;
    this.w = type.w;
    this.h = type.h;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.homeX = x;
    this.homeY = y;
    this.facing = -1;
    this.onGround = false;

    const scale = level.difficulty;
    this.maxHp = Math.round(type.hp * scale);
    this.hp = this.maxHp;
    this.damage = Math.round(type.damage * (0.7 + scale * 0.45));
    this.speed = type.speed;

    this.dead = false;
    this.deathTimer = 0;
    this.hurtFlash = 0;
    this.stun = 0;
    this.attackCd = rand(0, type.attackCooldown);
    this.windup = 0;
    this.swing = 0;
    this.animTime = rand(0, 3);
    this.aggro = false;
    this.lostTimer = 0;
    this.patrolRange = 110;
    this.phase = 0;
    this.bossAction = null;
    this.bossTimer = 1.2;
    this.summons = 0;
    this.isBoss = Boolean(type.boss);
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get centerY() {
    return this.y + this.h / 2;
  }

  update(dt, game) {
    if (this.dead) {
      this.deathTimer += dt;
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      this.vx *= 0.9;
      moveBody(this, game.world, dt);
      return;
    }

    this.animTime += dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3.5);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.stun = Math.max(0, this.stun - dt);

    const player = game.player;
    const dx = player.x + player.w / 2 - this.centerX;
    const dy = player.y + player.h / 2 - this.centerY;
    const dist = Math.hypot(dx, dy);
    this.updateAggro(dt, game, dist);

    if (this.stun > 0) {
      if (this.type.ai !== "flyer") this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      this.vx *= 0.85;
      moveBody(this, game.world, dt);
      return;
    }

    switch (this.type.ai) {
      case "flyer":
        this.updateFlyer(dt, game, dx, dy, dist);
        break;
      case "shooter":
        this.updateShooter(dt, game, dx, dist);
        break;
      case "boss":
        this.updateBoss(dt, game, dx, dy, dist);
        break;
      default:
        this.updateWalker(dt, game, dx, dist);
    }

    if (this.y > game.world.killY) this.hurt(this.hp, game, {});
  }

  applyGroundPhysics(dt, game) {
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    moveBody(this, game.world, dt);
  }

  get detectRange() {
    return this.type.detectRange ?? this.type.aggroRange ?? 160;
  }

  get leashRange() {
    return this.type.leashRange ?? this.detectRange * 1.85;
  }

  canSeePlayer(game) {
    const p = game.player;
    return game.world.hasLineOfSight(this.centerX, this.centerY, p.x + p.w / 2, p.y + p.h * 0.4);
  }

  dropAggro() {
    this.aggro = false;
    this.lostTimer = 0;
    this.windup = 0;
    this.swing = 0;
    this.bossAction = null;
  }

  /**
   * Acquire aggro only nearby (and with line of sight). Keep chasing until the
   * player stays outside the leash for a short grace, so running away actually
   * breaks combat instead of dragging the whole map.
   */
  updateAggro(dt, game, dist) {
    const dropTime = this.isBoss ? 2.2 : 0.95;
    if (!this.aggro) {
      const closeEnough = dist <= 48 || (dist <= this.detectRange && this.canSeePlayer(game));
      if (closeEnough) {
        this.aggro = true;
        this.lostTimer = 0;
      }
      return;
    }
    if (dist <= this.leashRange) {
      this.lostTimer = 0;
      return;
    }
    this.lostTimer += dt;
    if (this.lostTimer >= dropTime) this.dropAggro();
  }

  /** Stops walkers from strolling off ledges unless they are chasing the player. */
  edgeAhead(world) {
    const probeX = this.facing > 0 ? this.x + this.w + 4 : this.x - 4;
    const tx = Math.floor(probeX / TILE);
    const ty = Math.floor((this.y + this.h + 6) / TILE);
    return !world.isSolid(tx, ty) && world.get(tx, ty) !== 2;
  }

  updateWalker(dt, game, dx, dist) {
    const attackRange = this.type.attackRange;
    if (this.swing > 0) {
      this.swing -= dt;
      this.vx *= 0.8;
      if (this.swing <= 0) this.hitPlayer(game, attackRange);
      this.applyGroundPhysics(dt, game);
      return;
    }

    if (this.aggro) {
      this.facing = Math.sign(dx) || this.facing;
      if (dist > attackRange * 0.8) {
        const blocked = this.hitWall || (this.edgeAhead(game.world) && this.onGround && Math.abs(dx) > 60);
        this.vx = blocked ? 0 : this.facing * this.speed;
        if (blocked && this.onGround && Math.abs(dx) > 40 && this.hitWall) this.vy = -520;
      } else {
        this.vx *= 0.7;
        if (this.attackCd <= 0) {
          this.swing = 0.34;
          this.attackCd = this.type.attackCooldown;
        }
      }
    } else {
      const homeDist = this.x + this.w / 2 - this.homeX;
      if (Math.abs(homeDist) > this.patrolRange) {
        this.facing = homeDist > 0 ? -1 : 1;
      } else {
        if (this.x < this.homeX - this.patrolRange * 0.85) this.facing = 1;
        if (this.x > this.homeX + this.patrolRange * 0.85) this.facing = -1;
      }
      if (this.hitWall || this.edgeAhead(game.world)) this.facing *= -1;
      this.vx = this.facing * this.speed * 0.45;
    }

    this.applyGroundPhysics(dt, game);
  }

  updateFlyer(dt, game, dx, dy, dist) {
    if (!this.aggro) {
      const hx = this.homeX - this.centerX;
      const hy = this.homeY - this.centerY;
      this.vx = Math.cos(this.animTime * 1.2) * 36 + hx * 1.35;
      this.vy = Math.sin(this.animTime * 2.2) * 26 + hy * 1.35;
      const sp = Math.hypot(this.vx, this.vy);
      const cap = this.speed * 0.7;
      if (sp > cap) {
        this.vx = (this.vx / sp) * cap;
        this.vy = (this.vy / sp) * cap;
      }
    } else {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      this.vx += nx * 420 * dt;
      this.vy += (ny * 420 + Math.sin(this.animTime * 5) * 120) * dt;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > this.speed) {
        this.vx = (this.vx / sp) * this.speed;
        this.vy = (this.vy / sp) * this.speed;
      }
      this.facing = Math.sign(dx) || this.facing;
      if (dist < this.type.attackRange && this.attackCd <= 0) {
        this.attackCd = this.type.attackCooldown;
        game.player.takeDamage(this.damage, game, this);
      }
    }
    moveBody(this, game.world, dt);
  }

  updateShooter(dt, game, dx, dist) {
    if (this.aggro) {
      this.facing = Math.sign(dx) || this.facing;
      if (dist < this.type.attackRange) {
        if (dist < 170) this.vx = -this.facing * this.speed;
        else this.vx *= 0.8;

        if (this.windup > 0) {
          this.windup -= dt;
          this.vx *= 0.5;
          if (this.windup <= 0) this.shoot(game);
        } else if (this.attackCd <= 0) {
          this.windup = 0.5;
          this.attackCd = this.type.attackCooldown;
        }
      } else {
        this.vx = this.facing * this.speed * 0.7;
        this.windup = 0;
      }
    } else {
      this.windup = 0;
      this.vx *= 0.85;
    }
    this.applyGroundPhysics(dt, game);
  }

  shoot(game) {
    const p = game.player;
    const sx = this.centerX + this.facing * 16;
    const sy = this.y + this.h * 0.35;
    const conf = this.type.projectile;
    const dx = p.x + p.w / 2 - sx;
    const dy = p.y + p.h / 2 - sy;
    const d = Math.hypot(dx, dy) || 1;
    game.projectiles.push(
      new Projectile({
        x: sx,
        y: sy,
        vx: (dx / d) * conf.speed,
        vy: (dy / d) * conf.speed,
        damage: this.damage,
        kind: conf.kind,
        gravity: conf.gravity || 0,
        homing: conf.homing || 0,
        fromPlayer: false,
      })
    );
    Sfx.play("bolt");
  }

  hitPlayer(game, range) {
    const box = {
      x: this.facing > 0 ? this.x + this.w - 8 : this.x - range + 8,
      y: this.y + 4,
      w: range,
      h: this.h,
    };
    if (aabb(box, game.player)) game.player.takeDamage(this.damage, game, this);
    game.burst(box.x + box.w / 2, box.y + box.h / 2, 5, this.type.colors.eye, 70);
  }

  // ── Boss behaviour ────────────────────────────────────────────────────────
  updateBoss(dt, game, dx, dy, dist) {
    if (!this.aggro) {
      this.vx *= 0.85;
      this.applyGroundPhysics(dt, game);
      return;
    }

    const hpPct = this.hp / this.maxHp;
    const newPhase = hpPct < 0.35 ? 2 : hpPct < 0.7 ? 1 : 0;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.bossAction = null;
      this.bossTimer = 0.5;
      Sfx.play("boss");
      game.camera.kick(14);
      game.shockwaves.push({ x: this.centerX, y: this.centerY, r: 20, max: 320, life: 0.8, color: this.type.colors.eye });
      game.addFloater(this.centerX, this.y - 10, "ЯРОСТЬ!", this.type.colors.eye, 1.6);
    }

    this.facing = Math.sign(dx) || this.facing;

    if (this.bossAction) {
      this.runBossAction(dt, game, dx, dist);
      this.applyGroundPhysics(dt, game);
      return;
    }

    this.bossTimer -= dt;
    if (this.bossTimer <= 0) {
      const options = ["slam", "volley", "charge"];
      if (this.typeId === "bear-king" && this.phase >= 1) options.push("summon", "charge");
      if (this.phase >= 1) options.push("volley");
      this.bossAction = { name: pick(options), t: 0, fired: false, hitSet: new Set() };
      this.bossTimer = (this.phase === 2 ? 1.0 : this.phase === 1 ? 1.5 : 2.0) * rand(0.85, 1.2);
    } else if (dist > this.type.attackRange) {
      this.vx = this.facing * this.speed * (this.phase === 2 ? 1.25 : 1);
    } else {
      this.vx *= 0.8;
      if (this.attackCd <= 0) {
        this.swingBoss(game);
      }
    }
    this.applyGroundPhysics(dt, game);
  }

  swingBoss(game) {
    this.attackCd = this.type.attackCooldown;
    this.hitPlayer(game, this.type.attackRange);
    game.camera.kick(6);
  }

  runBossAction(dt, game, dx, dist) {
    const a = this.bossAction;
    a.t += dt;

    if (a.name === "slam") {
      if (a.t < 0.5) {
        this.vx *= 0.8;
        if (a.t > 0.35 && this.onGround) this.vy = -700;
      } else if (!a.fired && this.onGround && a.t > 0.6) {
        a.fired = true;
        game.camera.kick(16);
        Sfx.play("heavy");
        game.shockwaves.push({ x: this.centerX, y: this.y + this.h, r: 14, max: 260, life: 0.5, color: this.type.colors.eye });
        const box = { x: this.centerX - 150, y: this.y, w: 300, h: this.h + 20 };
        if (aabb(box, game.player)) game.player.takeDamage(this.damage * 1.4, game, this);
        for (let i = 0; i < 3; i++) {
          const dirSign = i === 0 ? -1 : 1;
          game.projectiles.push(
            new Projectile({
              x: this.centerX + dirSign * 40,
              y: this.y + this.h - 14,
              vx: dirSign * (200 + i * 60),
              vy: -180,
              damage: Math.round(this.damage * 0.7),
              kind: "rock",
              gravity: 900,
              fromPlayer: false,
            })
          );
        }
      } else if (a.t > 1.15) {
        this.bossAction = null;
      }
      if (!this.onGround) this.vx = Math.sign(dx) * 220;
    } else if (a.name === "volley") {
      if (a.t > 0.45 && !a.fired) {
        a.fired = true;
        const count = this.phase === 2 ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.34;
          const dirX = this.facing;
          game.projectiles.push(
            new Projectile({
              x: this.centerX,
              y: this.y + this.h * 0.3,
              vx: Math.cos(angle) * 60 * dirX + dirX * 260,
              vy: Math.sin(angle) * 260,
              damage: Math.round(this.damage * 0.65),
              kind: "orb",
              gravity: 260,
              fromPlayer: false,
            })
          );
        }
        Sfx.play("bolt");
      }
      this.vx *= 0.85;
      if (a.t > 1.0) this.bossAction = null;
    } else if (a.name === "charge") {
      if (a.t < 0.45) {
        this.vx *= 0.8;
      } else if (a.t < 1.25) {
        this.vx = this.facing * this.speed * 3.1;
        if (aabb(this, game.player)) game.player.takeDamage(this.damage * 1.2, game, this);
        if (Math.random() < 0.5) {
          game.burst(this.centerX, this.y + this.h, 3, this.type.colors.eye, 90);
        }
        if (this.hitWall) {
          this.bossAction = null;
          game.camera.kick(12);
        }
      } else {
        this.bossAction = null;
      }
    } else if (a.name === "summon") {
      if (a.t > 0.6 && !a.fired) {
        a.fired = true;
        Sfx.play("roar");
        const minionType = this.phase === 2 ? "skeleton" : "ghoul";
        for (let i = 0; i < 2; i++) {
          const mx = this.centerX + (i === 0 ? -90 : 90);
          const minion = new Enemy(minionType, mx, this.y, game.level);
          minion.aggro = true;
          minion.lostTimer = 0;
          game.enemies.push(minion);
          game.burst(mx, this.y + this.h, 14, "#b06bff", 140);
        }
      }
      this.vx *= 0.8;
      if (a.t > 1.2) this.bossAction = null;
    }
  }

  hurt(amount, game, { knockX = 0, knockY = 0, crit = false, stun = 0 } = {}) {
    if (this.dead) return;
    this.hp -= amount;
    this.hurtFlash = 1;
    this.aggro = true;
    this.lostTimer = 0;
    if (!this.isBoss) {
      this.vx += knockX * 0.5;
      this.vy += knockY * 0.5;
      if (stun) this.stun = Math.max(this.stun, stun);
    } else if (stun) {
      this.stun = Math.max(this.stun, stun * 0.3);
    }
    game.addFloater(this.centerX, this.y + 6, `${Math.round(amount)}`, crit ? "#ffd45f" : "#ffffff", crit ? 1.35 : 1);
    game.burst(this.centerX, this.centerY, crit ? 12 : 6, crit ? "#ffd45f" : "#c94f4f", 110);
    Sfx.play("hit");

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathTimer = 0;
      this.vy = -220;
      this.vx = knockX * 0.6;
      game.onEnemyKilled(this);
    }
  }
}

export class Projectile {
  constructor({ x, y, vx, vy, damage, kind, gravity = 0, homing = 0, fromPlayer = false, pierce = 0 }) {
    this.x = x;
    this.y = y;
    this.w = kind === "arrow" ? 18 : 14;
    this.h = kind === "arrow" ? 5 : 14;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.kind = kind;
    this.gravity = gravity;
    this.homing = homing;
    this.fromPlayer = fromPlayer;
    this.pierce = pierce;
    this.life = 4;
    this.dead = false;
    this.hitSet = new Set();
    this.trail = [];
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    if (this.homing > 0 && !this.fromPlayer) {
      const p = game.player;
      const dx = p.x + p.w / 2 - this.x;
      const dy = p.y + p.h / 2 - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(this.vx, this.vy) || 1;
      this.vx += (dx / d) * speed * this.homing * dt;
      this.vy += (dy / d) * speed * this.homing * dt;
      const ns = Math.hypot(this.vx, this.vy);
      this.vx = (this.vx / ns) * speed;
      this.vy = (this.vy / ns) * speed;
    }

    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    if (game.world.blocksAt(this.x, this.y)) {
      this.dead = true;
      game.burst(this.x, this.y, 6, this.fromPlayer ? "#b06bff" : "#e0a04f", 80);
      return;
    }

    const box = { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
    if (this.fromPlayer) {
      for (const enemy of game.enemies) {
        if (enemy.dead || this.hitSet.has(enemy.id) || !aabb(box, enemy)) continue;
        this.hitSet.add(enemy.id);
        const { damage, crit } = game.player.rollDamage(this.damage);
        enemy.hurt(damage, game, { knockX: Math.sign(this.vx) * 120, knockY: -60, crit });
        game.player.healFromLifesteal(damage, game);
        if (this.pierce-- <= 0) {
          this.dead = true;
          return;
        }
      }
    } else if (aabb(box, game.player)) {
      game.player.takeDamage(this.damage, game, { x: this.x, y: this.y, w: 0 });
      this.dead = true;
    }
  }
}

export class Pickup {
  constructor(x, y, kind, payload) {
    this.x = x;
    this.y = y;
    this.w = kind === "item" ? 20 : 14;
    this.h = this.w;
    this.vx = rand(-90, 90);
    this.vy = rand(-320, -180);
    this.kind = kind;
    this.payload = payload;
    this.life = 30;
    this.dead = false;
    this.onGround = false;
    this.animTime = rand(0, 6);
    this.collectDelay = 0.35;
  }

  update(dt, game) {
    this.animTime += dt;
    this.life -= dt;
    this.collectDelay = Math.max(0, this.collectDelay - dt);
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    const p = game.player;
    const dx = p.x + p.w / 2 - (this.x + this.w / 2);
    const dy = p.y + p.h / 2 - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy);

    // Coins and souls fly toward the knight once he is close.
    if (this.kind !== "item" && dist < 140 && this.collectDelay === 0) {
      const pull = 900 / Math.max(40, dist);
      this.vx += (dx / dist) * 700 * pull * dt;
      this.vy += (dy / dist) * 700 * pull * dt;
    } else {
      this.vy = Math.min(this.vy + GRAVITY * 0.55 * dt, 620);
      if (this.onGround) this.vx *= 0.86;
    }

    moveBody(this, game.world, dt);

    if (dist < 34 && this.collectDelay === 0) {
      this.dead = true;
      game.collect(this);
    }
  }
}

export class Chest {
  constructor(x, y) {
    this.x = x;
    this.y = y - 26;
    this.w = 34;
    this.h = 26;
    this.opened = false;
    this.animTime = 0;
  }
}

export class Checkpoint {
  constructor(data) {
    Object.assign(this, data);
    this.animTime = rand(0, 6);
  }
}

export function makeEnemy(spawn, level) {
  const e = new Enemy(spawn.type, spawn.x, spawn.y, level);
  e.patrolRange = spawn.patrol || 110;
  return e;
}

export function makeParticle(x, y, color, speed) {
  const angle = Math.random() * Math.PI * 2;
  const v = rand(speed * 0.35, speed);
  return {
    x,
    y,
    vx: Math.cos(angle) * v,
    vy: Math.sin(angle) * v - 40,
    life: rand(0.28, 0.7),
    maxLife: 0.7,
    size: rand(1.5, 3.6),
    color,
    gravity: rand(200, 520),
  };
}

export const randomEnemyType = (level) => {
  const weighted = [];
  for (const e of level.enemies) for (let i = 0; i < e.weight; i++) weighted.push(e.type);
  return weighted[randInt(0, weighted.length - 1)];
};
