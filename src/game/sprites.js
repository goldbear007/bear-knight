import { lerp, shade } from "../core/utils.js";
import { Art } from "./art.js";

/**
 * Fist sits at this fraction of the sprite (0 = tip, 1 = pommel).
 * Swords: at the crossguard so the guard sits on the fist and the hilt hangs below.
 * Axes/mauls: middle of the long haft.
 * Daggers: short knife, still under the guard.
 */
const WEAPON_GRIP_Y = {
  "rusty-sword": 0.68,
  "iron-longsword": 0.72,
  "wolfbane-blade": 0.64,
  "hunter-dagger": 0.62,
  "moonfang-saber": 0.72,
  "bear-claw-axe": 0.66,
  "grimhollow-maul": 0.59,
  "dread-bear-cleaver": 0.76,
};

/** Whole-sprite height in knight pixels. Daggers stay small; polearms stay long. */
const WEAPON_DRAW_H = {
  "hunter-dagger": 20,
  "moonfang-saber": 38,
  "rusty-sword": 50,
  "wolfbane-blade": 48,
  "iron-longsword": 56,
  "bear-claw-axe": 58,
  "grimhollow-maul": 62,
  "dread-bear-cleaver": 54,
};

const WEAPON_DRAW_H_KIND = {
  dagger: 20,
  sword: 50,
  axe: 58,
  hammer: 62,
};

const DEFAULTS = {
  helm: { main: "#c9bda4", trim: "#6d5c44" },
  chest: { main: "#6b5540", trim: "#3a2b1e", fur: "#4a3a2b" },
  legs: { main: "#544539", trim: "#33291f" },
  cloak: { main: "#3a4634", trim: "#252e22" },
  weapon: { blade: "#8a8f99", grip: "#4a3527", glow: null },
};

function limb(ctx, x1, y1, x2, y2, width, color) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = shade(color, -50);
  ctx.lineWidth = width + 2.4;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function drawWeaponSprite(ctx, img, weaponId, kind, pal, glowPulse) {
  const gripFrac = WEAPON_GRIP_Y[weaponId] ?? 0.78;
  const holdH = WEAPON_DRAW_H[weaponId] ?? WEAPON_DRAW_H_KIND[kind] ?? 50;
  const scale = holdH / img.height;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  if (pal?.glow) {
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 8 + glowPulse * 5;
  }
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, -w / 2, -h * gripFrac, w, h);
  ctx.restore();
}

function drawWeapon(ctx, kind, pal, glowPulse, weaponId) {
  const sprite = weaponId && Art.weapons?.[weaponId];
  if (sprite && sprite.width && sprite.height) {
    drawWeaponSprite(ctx, sprite, weaponId, kind, pal, glowPulse);
    return;
  }

  const blade = pal.blade || "#8a8f99";
  const grip = pal.grip || "#4a3527";
  ctx.save();
  if (pal.glow) {
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 10 + glowPulse * 6;
  }

  switch (kind) {
    case "dagger":
      limb(ctx, 0, 1, 0, 5, 3.4, grip);
      poly(ctx, [[-2.2, -1], [2.2, -1], [1.6, -16], [0, -20], [-1.6, -16]], blade);
      poly(ctx, [[-5.5, -2], [5.5, -2], [5.5, 1], [-5.5, 1]], shade(grip, 30));
      break;
    case "axe":
      // Fist at mid-haft: head above, butt below.
      limb(ctx, 0, 16, 0, -22, 6, grip);
      poly(ctx, [[1, -22], [18, -26], [24, -12], [14, -2], [2, -6]], blade);
      poly(ctx, [[-1, -22], [-14, -25], [-18, -12], [-11, -3], [-2, -7]], shade(blade, -25));
      break;
    case "hammer":
      limb(ctx, 0, 18, 0, -20, 7, grip);
      ctx.fillStyle = blade;
      ctx.fillRect(-16, -34, 32, 18);
      ctx.fillStyle = shade(blade, -35);
      ctx.fillRect(-16, -22, 32, 6);
      ctx.fillStyle = shade(blade, 25);
      ctx.fillRect(-16, -34, 32, 4);
      break;
    default: {
      // Grip at the origin. Blade extends -Y (up when the sword is world-upright).
      poly(ctx, [[-6, -3], [6, -3], [7.2, -28], [0, -38], [-7.2, -28]], blade);
      poly(ctx, [[2.2, -5], [5.2, -5], [5.8, -27], [3.0, -27]], shade(blade, 40));
      poly(ctx, [[-10, -2], [10, -2], [9, 2], [-9, 2]], shade(grip, 25));
      limb(ctx, 0, 2, 0, 11, 4.4, grip);
      ellipse(ctx, 0, 12, 3.4, 3.2, shade(grip, 50));
      break;
    }
  }
  ctx.restore();
}

/**
 * Sword arm in the forward hand. Idle stands the blade straight up;
 * attacks flip it along the forearm for the cut.
 */
function weaponArmPose(state, t, attackProgress, combo) {
  const heavy = state === "heavy";
  let upper;
  let elbow;

  if (attackProgress >= 0) {
    const windup = heavy ? 0.38 : 0.28;
    if (combo === 1 && !heavy) {
      if (attackProgress < 0.3) {
        const u = attackProgress / 0.3;
        upper = lerp(0.9, 1.45, u);
        elbow = lerp(0.48, 0.25, u);
      } else {
        const s = (attackProgress - 0.3) / 0.7;
        upper = lerp(1.45, -1.2, s);
        elbow = lerp(0.25, 0.2, s);
      }
    } else if (attackProgress < windup) {
      const u = attackProgress / windup;
      upper = lerp(0.9, heavy ? 2.2 : 2.0, u);
      elbow = lerp(0.48, 0.22, u);
    } else {
      const s = (attackProgress - windup) / (1 - windup);
      upper = lerp(heavy ? 2.2 : 2.0, heavy ? -1.4 : -1.2, s);
      elbow = lerp(0.22, 0.18, s);
    }
  } else if (state === "dash") {
    upper = 1.28;
    elbow = 0.32;
  } else if (state === "jump" || state === "fall") {
    upper = 1.08;
    elbow = 0.38;
  } else if (state === "run") {
    upper = 0.88 + Math.sin(t * 13) * 0.05;
    elbow = 0.48;
  } else {
    upper = 0.9 + Math.sin(t * 2.2) * 0.03;
    elbow = 0.48;
  }
  const rest = attackProgress < 0;
  const ru = -upper;
  const re = -elbow;
  return {
    upper: ru,
    elbow: re,
    // Idle: cancel the arm so the blade stands world-up. Attack: blade follows the cut.
    wrist: rest ? -(ru + re) : Math.PI,
  };
}

/** Rear arm: 90° guard fist, no weapon. Positive angles tuck the hand behind. */
function guardArmPose(state, t, attackProgress) {
  if (attackProgress >= 0) return { upper: 0.12, elbow: 0.82 };
  if (state === "dash") return { upper: -0.35, elbow: 0.7 };
  if (state === "jump" || state === "fall") return { upper: 0.55, elbow: 0.88 };
  if (state === "run") {
    return { upper: 0.32 - Math.sin(t * 13) * 0.18, elbow: 1.02 };
  }
  return { upper: 0.28 + Math.sin(t * 2.2) * 0.03, elbow: 1.08 };
}

function drawArm(ctx, x, y, upper, elbow, sleeve, forearm, onHand) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(upper);
  limb(ctx, 0, 0, 0, 12, 6.6, sleeve);
  ellipse(ctx, 0, 12, 3.1, 3.0, shade(sleeve, -22));
  ctx.translate(0, 12);
  ctx.rotate(elbow);
  limb(ctx, 0, 0, 0, 11, 5.6, forearm);
  ctx.translate(0, 11);
  onHand?.(ctx);
  ctx.restore();
}

function drawGauntlet(ctx, color) {
  ctx.save();
  ctx.fillStyle = shade(color, -20);
  ctx.beginPath();
  ctx.ellipse(0, 2.2, 5.4, 4.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 2.0, 4.6, 4.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(color, -50);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = shade(color, 12);
  ctx.beginPath();
  ctx.ellipse(3.8, 0.4, 2.0, 2.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3.2, 1.2);
  ctx.lineTo(3.0, 1.2);
  ctx.stroke();
  ctx.restore();
}

/**
 * The hero: a lean dark-fantasy knight. Combat crouch, greatsword in the
 * forward hand with the blade standing up, rear arm in a 90° guard.
 */
export function drawKnight(ctx, player, stats, time) {
  const pal = {
    helm: stats.palette.helm || DEFAULTS.helm,
    chest: stats.palette.chest || DEFAULTS.chest,
    legs: stats.palette.legs || DEFAULTS.legs,
    cloak: stats.palette.cloak || DEFAULTS.cloak,
    weapon: stats.palette.weapon || DEFAULTS.weapon,
  };
  const cloak = pal.cloak;

  const state = player.state;
  const t = player.animTime;
  const feetX = player.x + player.w / 2;
  const feetY = player.y + player.h;

  ctx.save();
  ctx.translate(Math.round(feetX), Math.round(feetY));
  ctx.scale(player.facing, 1);

  if (state === "dead") {
    const fall = Math.min(1, player.animTime * 2.5);
    ctx.rotate(fall * 1.45);
    ctx.translate(0, fall * 6);
  }

  // Animation drivers
  const runCycle = Math.sin(t * 13);
  const runCycle2 = Math.sin(t * 13 + Math.PI);
  const breathe = Math.sin(t * 2.4) * 1.2;
  const running = state === "run";
  const airborne = state === "jump" || state === "fall";
  const bob = running ? Math.abs(Math.sin(t * 13)) * 2.2 : breathe;

  let attackProgress = -1;
  if (state === "attack" || state === "heavy") {
    attackProgress = 1 - player.attackTimer / player.attackDuration;
  }

  const crouch = running || airborne ? 0 : 3;
  const hipY = -30 - bob * 0.35 + crouch;
  const shoulderY = -52 - bob + crouch;
  const idleLean = running ? 0.1 : state === "dash" ? 0.28 : 0.14;
  const sleeve = shade(pal.chest.main, -12);
  const gauntlet = shade(pal.helm.main, 8);
  const gold = pal.chest.trim || "#c56a2a";
  const fur = pal.chest.fur || shade(pal.helm.main, -10);
  const swordPose = weaponArmPose(state, t, attackProgress, player.attackCombo);
  const guardPose = guardArmPose(state, t, attackProgress);

  const legSwing = running ? runCycle * 10 : airborne ? -7 : 0;
  const legSwing2 = running ? runCycle2 * 10 : airborne ? 6 : 0;
  const kneeLift = airborne ? 7 : crouch;
  const backFoot = running || airborne ? -6 + legSwing2 : -9;
  const frontFoot = running || airborne ? 6 + legSwing : 9;

  // Olive tabard / cloak behind the legs
  {
    const sway = running ? runCycle * 5 : airborne ? -8 : Math.sin(t * 1.6) * 2;
    poly(
      ctx,
      [
        [-6, hipY - 4],
        [7, hipY - 4],
        [10 + sway * 0.3, -2],
        [2, 0],
        [-8 - sway, -2],
      ],
      cloak.main
    );
    poly(
      ctx,
      [
        [-3, hipY - 2],
        [5, hipY - 2],
        [4, -8],
        [-2, -8],
      ],
      shade(cloak.main, -28)
    );
  }

  // Rear guard arm (behind the body)
  drawArm(ctx, -8, shoulderY + 4, guardPose.upper, guardPose.elbow, shade(sleeve, -25), shade(sleeve, -35), (c) => {
    drawGauntlet(c, shade(gauntlet, -15));
  });

  // Back leg (trailing foot)
  limb(ctx, -4, hipY, -6 + legSwing2 * 0.4, -16 - kneeLift * 0.2, 6.4, shade(pal.legs.main, -28));
  limb(ctx, -6 + legSwing2 * 0.4, -16 - kneeLift * 0.2, backFoot, -1, 5.8, shade(pal.legs.main, -28));
  ellipse(ctx, backFoot, -1.2, 5.2, 2.6, shade(pal.legs.trim, -15));

  // Torso: slender cuirass, gold straps, pale fur collar
  ctx.save();
  ctx.rotate(idleLean);

  poly(
    ctx,
    [
      [-9, shoulderY + 3],
      [10, shoulderY + 1],
      [8, hipY + 5],
      [-7, hipY + 6],
    ],
    pal.chest.main
  );
  poly(ctx, [[-2, shoulderY + 6], [2.2, shoulderY + 6], [1.6, hipY + 2], [-1.6, hipY + 2]], gold);
  poly(ctx, [[3.4, shoulderY + 8], [5.4, shoulderY + 8], [4.6, hipY + 1], [2.8, hipY + 1]], shade(gold, -20));
  ctx.fillStyle = shade(pal.chest.main, -30);
  ctx.fillRect(-7, hipY, 14, 4);

  for (let i = -8; i <= 9; i += 3.5) {
    ellipse(ctx, i, shoulderY + 2, 4.2, 3.6, fur);
  }
  ctx.restore();

  // Front leg (lead foot)
  limb(ctx, 3, hipY, 6 + legSwing * 0.35, -15 - kneeLift * 0.15, 6.2, pal.legs.main);
  limb(ctx, 6 + legSwing * 0.35, -15 - kneeLift * 0.15, frontFoot, -1, 5.6, pal.legs.main);
  ellipse(ctx, frontFoot, -1.2, 5.4, 2.6, pal.legs.trim);
  poly(ctx, [[5, hipY + 2], [7, hipY + 2], [7.4, hipY + 14], [5.2, hipY + 14]], shade(gold, -10));

  // Head: small helm, pale hood/fur, short muzzle
  const headY = shoulderY - 9;
  ctx.save();
  ctx.translate(2, headY);
  if (running) ctx.rotate(runCycle * 0.025);

  ellipse(ctx, -5, -7, 3.4, 3.8, shade(fur, -15));
  ellipse(ctx, 6, -7, 3.4, 3.8, shade(fur, -15));
  ellipse(ctx, -5, -7, 1.7, 2.0, pal.helm.trim);
  ellipse(ctx, 6, -7, 1.7, 2.0, pal.helm.trim);

  if (cloak) {
    poly(
      ctx,
      [
        [-11, 4],
        [-10, -8],
        [-3, -14],
        [6, -14],
        [11, -6],
        [10, 6],
        [3, 2],
        [-6, 3],
      ],
      shade(cloak.main, 8)
    );
  }

  ellipse(ctx, 1, 0, 7.4, 7.2, pal.helm.main);
  poly(ctx, [[3, -1], [12, 1], [12, 5], [4, 5]], shade(pal.helm.main, 14));
  ellipse(ctx, 12, 2.6, 1.8, 1.6, shade(pal.helm.trim, -15));

  const glow = 0.6 + Math.sin(time * 4) * 0.25;
  ctx.save();
  ctx.shadowColor = "#e8d090";
  ctx.shadowBlur = 10 * glow;
  ellipse(ctx, 4.5, -1.2, 2.1, 1.7, "#f0e2a8");
  ellipse(ctx, -1.5, -1.6, 1.7, 1.4, "#e8d898");
  ctx.restore();
  ctx.restore();

  // Forward sword arm — blade stands upright in the visible hand
  drawArm(ctx, 9, shoulderY + 3, swordPose.upper, swordPose.elbow, sleeve, shade(sleeve, 10), (c) => {
    c.save();
    c.rotate(swordPose.wrist);
    drawWeapon(c, stats.weaponKind, pal.weapon, Math.sin(time * 3) * 0.5 + 0.5, stats.weaponId);
    c.restore();
    drawGauntlet(c, gauntlet);
  });

  ctx.restore();

  // ── Overlays ─────────────────────────────────────────────────────────────
  if (player.hurtFlash > 0) {
    ctx.save();
    ctx.globalAlpha = player.hurtFlash * 0.5;
    ctx.globalCompositeOperation = "lighter";
    const cy = player.y + player.h / 2;
    const flash = ctx.createRadialGradient(feetX, cy, 2, feetX, cy, player.h * 0.7);
    flash.addColorStop(0, "rgba(255,110,110,0.8)");
    flash.addColorStop(1, "rgba(255,60,60,0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.ellipse(feetX, cy, player.w * 0.95, player.h * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (player.ward > 0.5) {
    ctx.save();
    ctx.globalAlpha = 0.25 + (player.ward / Math.max(1, player.maxWard)) * 0.25;
    ctx.strokeStyle = "#a878ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(feetX, feetY - player.h / 2, player.w * 0.95, player.h * 0.66, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Attack arc that traces the weapon swing, drawn above the knight. */
export function drawSwingArc(ctx, player) {
  if (player.attackTimer <= 0) return;
  const progress = 1 - player.attackTimer / player.attackDuration;
  if (progress < 0.24 || progress > 0.78) return;
  const heavy = player.state === "heavy";
  const shape = player.weaponShape;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h * 0.42;
  const radius = shape.reach * (heavy ? 1.15 : 0.95);
  const p = (progress - 0.24) / 0.54;
  const start = -1.25 + p * 2.1;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(player.facing, 1);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.55 * (1 - Math.abs(p - 0.5) * 1.3);
  const grad = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(1, heavy ? "rgba(255,170,80,0.9)" : "rgba(200,225,255,0.85)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, start - 0.5, start + 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawEnemy(ctx, e, time) {
  const c = e.type.colors;
  const cx = e.x + e.w / 2;
  const bottom = e.y + e.h;
  const t = e.animTime;

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottom));
  ctx.scale(e.facing, 1);

  if (e.dead) {
    ctx.globalAlpha = Math.max(0, 1 - e.deathTimer * 1.4);
    ctx.rotate(Math.min(1.5, e.deathTimer * 3));
  }

  const walkCycle = Math.sin(t * 9);
  const windup = e.swing > 0 || (e.windup || 0) > 0;

  switch (e.typeId) {
    case "bat": {
      const flap = Math.sin(t * 18);
      poly(ctx, [[0, -12], [-26, -20 - flap * 8], [-14, -6]], c.dark);
      poly(ctx, [[0, -12], [26, -20 + flap * 8], [14, -6]], c.dark);
      ellipse(ctx, 0, -12, 9, 8, c.body);
      ellipse(ctx, 4, -14, 2, 2, c.eye);
      ellipse(ctx, -3, -14, 2, 2, c.eye);
      poly(ctx, [[-6, -19], [-3, -26], [-1, -18]], c.body);
      poly(ctx, [[6, -19], [3, -26], [1, -18]], c.body);
      break;
    }
    case "skeleton": {
      limb(ctx, -3, -22, -4 + walkCycle * 6, -1, 5, c.body);
      limb(ctx, 3, -22, 4 - walkCycle * 6, -1, 5, c.body);
      poly(ctx, [[-8, -44], [8, -44], [6, -20], [-6, -20]], c.cloth);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = c.body;
        ctx.fillRect(-7, -42 + i * 5, 14, 2.4);
      }
      limb(ctx, -7, -40, -13 - (windup ? 6 : 0), -26 + walkCycle * 3, 4.5, c.body);
      limb(ctx, 7, -40, 14 + (windup ? 8 : 0), -30 - (windup ? 10 : 0), 4.5, c.body);
      // sword
      ctx.save();
      ctx.translate(14 + (windup ? 8 : 0), -30 - (windup ? 10 : 0));
      ctx.rotate(windup ? -1.1 : -0.3);
      poly(ctx, [[-2, 0], [2, 0], [1.5, -26], [0, -30], [-1.5, -26]], "#b9c0cc");
      ctx.restore();
      ellipse(ctx, 1, -50, 8, 7.5, c.body);
      poly(ctx, [[4, -48], [12, -47], [11, -43], [4, -44]], c.body);
      ellipse(ctx, 3, -50, 2.2, 2.4, "#120e14");
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = 8;
      ellipse(ctx, 3, -50, 1.4, 1.6, c.eye);
      ctx.restore();
      break;
    }
    case "archer": {
      limb(ctx, -3, -22, -4 + walkCycle * 4, -1, 6, c.dark);
      limb(ctx, 3, -22, 4 - walkCycle * 4, -1, 6, c.dark);
      poly(ctx, [[-9, -44], [9, -44], [7, -18], [-7, -18]], c.cloth);
      ellipse(ctx, 0, -46, 9, 7, c.body);
      // hood
      poly(ctx, [[-10, -44], [0, -58], [10, -44], [0, -40]], c.cloth);
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = 8;
      ellipse(ctx, 4, -47, 2, 1.6, c.eye);
      ctx.restore();
      // bow
      ctx.save();
      ctx.translate(11, -34);
      ctx.strokeStyle = "#6b4a2a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = "rgba(230,230,230,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6.3, -12.5);
      ctx.lineTo(windup ? -6 : 4, 0);
      ctx.lineTo(6.3, 12.5);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "warlock": {
      const float = Math.sin(t * 2.4) * 3;
      ctx.translate(0, float);
      poly(ctx, [[-14, -2], [14, -2], [10, -40], [-10, -40]], c.cloth);
      poly(ctx, [[-11, -38], [0, -74], [11, -38], [0, -34]], c.body);
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = 12;
      ellipse(ctx, 3, -44, 2.4, 2, c.eye);
      ellipse(ctx, -4, -44, 2.4, 2, c.eye);
      ctx.restore();
      limb(ctx, 8, -38, 18, -30 - (windup ? 12 : 0), 5, c.body);
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = windup ? 22 : 10;
      ellipse(ctx, 20, -32 - (windup ? 12 : 0), windup ? 8 : 5, windup ? 8 : 5, c.eye);
      ctx.restore();
      break;
    }
    case "brute": {
      limb(ctx, -8, -28, -10 + walkCycle * 6, -1, 12, c.dark);
      limb(ctx, 8, -28, 10 - walkCycle * 6, -1, 12, c.dark);
      poly(ctx, [[-18, -56], [18, -56], [15, -24], [-15, -24]], c.body);
      ctx.fillStyle = c.cloth;
      ctx.fillRect(-16, -40, 32, 7);
      ellipse(ctx, 0, -62, 12, 10, c.body);
      poly(ctx, [[-14, -66], [-8, -78], [-4, -64]], c.dark);
      poly(ctx, [[14, -66], [8, -78], [4, -64]], c.dark);
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = 10;
      ellipse(ctx, 5, -63, 2.6, 2.2, c.eye);
      ellipse(ctx, -4, -63, 2.6, 2.2, c.eye);
      ctx.restore();
      limb(ctx, 14, -52, 26 + (windup ? 10 : 0), -34 - (windup ? 16 : 0), 9, c.body);
      ctx.save();
      ctx.translate(26 + (windup ? 10 : 0), -34 - (windup ? 16 : 0));
      ctx.rotate(windup ? -0.9 : 0.2);
      ctx.fillStyle = "#7e7568";
      ctx.fillRect(-4, -4, 8, 26);
      ctx.fillStyle = "#5c5449";
      ctx.fillRect(-12, -14, 24, 14);
      ctx.restore();
      break;
    }
    case "ossuary-warden": {
      const sway = Math.sin(t * 1.8) * 4;
      limb(ctx, -14, -46, -16, -1, 16, c.dark);
      limb(ctx, 14, -46, 16, -1, 16, c.dark);
      poly(ctx, [[-26, -88], [26, -88], [22, -40], [-22, -40]], c.body);
      ctx.fillStyle = c.cloth;
      ctx.fillRect(-24, -70, 48, 10);
      for (let i = 0; i < 5; i++) {
        ellipse(ctx, -18 + i * 9, -84, 4, 5, shade(c.body, -30));
      }
      ellipse(ctx, sway * 0.4, -98, 17, 15, c.body);
      poly(ctx, [[-18, -104], [-26, -126], [-8, -108]], c.dark);
      poly(ctx, [[18, -104], [26, -126], [8, -108]], c.dark);
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = 20;
      ellipse(ctx, 7 + sway * 0.4, -100, 4, 3.4, c.eye);
      ellipse(ctx, -6 + sway * 0.4, -100, 4, 3.4, c.eye);
      ctx.restore();
      // scythe
      ctx.save();
      ctx.translate(24, -74);
      ctx.rotate(windup ? -0.8 : -0.15 + sway * 0.01);
      limb(ctx, 0, 30, 0, -46, 6, "#43382c");
      ctx.strokeStyle = "#cfd6e2";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(-20, -44, 22, -0.35, 1.25);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "bear-king": {
      const rage = e.phase >= 2 ? 1 : 0;
      limb(ctx, -18, -52, -20, -1, 20, c.dark);
      limb(ctx, 18, -52, 20, -1, 20, c.dark);
      // body with fur
      poly(ctx, [[-32, -104], [32, -104], [27, -46], [-27, -46]], c.body);
      for (let i = -30; i <= 30; i += 7) ellipse(ctx, i, -104, 6, 6, shade(c.body, -18));
      ctx.fillStyle = c.cloth;
      ctx.fillRect(-28, -78, 56, 12);
      ellipse(ctx, 0, -80, 12, 10, shade(c.dark, 20));
      // head
      ellipse(ctx, 0, -118, 21, 19, c.body);
      ellipse(ctx, -16, -132, 7, 7.5, shade(c.body, -20));
      ellipse(ctx, 16, -132, 7, 7.5, shade(c.body, -20));
      poly(ctx, [[10, -120], [32, -116], [32, -108], [12, -110]], shade(c.body, 15));
      ellipse(ctx, 31, -113, 3.6, 3, "#241209");
      poly(ctx, [[20, -110], [24, -110], [22, -100]], "#f2ece0");
      poly(ctx, [[26, -110], [30, -110], [28, -102]], "#f2ece0");
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = 18 + rage * 14;
      ellipse(ctx, 9, -122, 4.4, 3.6, c.eye);
      ellipse(ctx, -6, -122, 4.4, 3.6, c.eye);
      ctx.restore();
      // crown
      ctx.fillStyle = "#e0b64a";
      ctx.fillRect(-16, -142, 32, 6);
      poly(ctx, [[-16, -142], [-11, -154], [-6, -142]], "#e0b64a");
      poly(ctx, [[-3, -142], [2, -156], [7, -142]], "#e0b64a");
      poly(ctx, [[10, -142], [15, -152], [18, -142]], "#e0b64a");
      // twin axes
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 34, -86);
        ctx.rotate(side * (windup ? 1.1 : 0.35));
        limb(ctx, 0, 26, 0, -30, 6, "#4a2a16");
        poly(ctx, [[1, -30], [22, -35], [28, -16], [16, -6], [2, -12]], "#c9b18a");
        ctx.restore();
      }
      break;
    }
    default: {
      // ghoul
      limb(ctx, -3, -20, -5 + walkCycle * 6, -1, 6, c.dark);
      limb(ctx, 3, -20, 5 - walkCycle * 6, -1, 6, c.dark);
      poly(ctx, [[-10, -38], [10, -38], [8, -16], [-8, -16]], c.body);
      ctx.fillStyle = c.cloth;
      ctx.fillRect(-9, -26, 18, 6);
      limb(ctx, -8, -34, -14 + walkCycle * 4, -18, 5, c.body);
      limb(ctx, 8, -34, 16 + (windup ? 8 : 0), -22 - (windup ? 8 : 0), 5, c.body);
      // claws
      ctx.strokeStyle = "#e8e0d0";
      ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(16 + (windup ? 8 : 0), -22 - (windup ? 8 : 0));
        ctx.lineTo(22 + (windup ? 8 : 0) + i, -17 - (windup ? 8 : 0) + i * 2);
        ctx.stroke();
      }
      ellipse(ctx, 1, -44, 8.5, 8, c.body);
      poly(ctx, [[4, -44], [13, -42], [11, -37], [4, -39]], shade(c.body, 12));
      ctx.save();
      ctx.shadowColor = c.eye;
      ctx.shadowBlur = 8;
      ellipse(ctx, 4, -46, 2.2, 1.8, c.eye);
      ellipse(ctx, -3, -46, 2.2, 1.8, c.eye);
      ctx.restore();
      break;
    }
  }

  ctx.restore();

  if (e.hurtFlash > 0 && !e.dead) {
    ctx.save();
    ctx.globalAlpha = e.hurtFlash * 0.5;
    ctx.globalCompositeOperation = "lighter";
    const rx = e.w * 0.7;
    const ry = e.h * 0.62;
    const flash = ctx.createRadialGradient(cx, e.y + e.h / 2, 2, cx, e.y + e.h / 2, Math.max(rx, ry));
    flash.addColorStop(0, "rgba(255,240,235,0.85)");
    flash.addColorStop(1, "rgba(255,120,110,0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.ellipse(cx, e.y + e.h / 2, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (e.stun > 0 && !e.dead) {
    ctx.save();
    ctx.fillStyle = "#ffd45f";
    for (let i = 0; i < 3; i++) {
      const a = time * 4 + (i * Math.PI * 2) / 3;
      ellipse(ctx, cx + Math.cos(a) * 12, e.y - 8 + Math.sin(a) * 4, 2.4, 2.4, "#ffd45f");
    }
    ctx.restore();
  }
}
