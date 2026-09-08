import { shade } from "../core/utils.js";

const DEFAULTS = {
  helm: { main: "#c9bda4", trim: "#6d5c44" },
  chest: { main: "#6b5540", trim: "#3a2b1e", fur: "#4a3a2b" },
  legs: { main: "#544539", trim: "#33291f" },
  cloak: null,
  weapon: { blade: "#8a8f99", grip: "#4a3527", glow: null },
};

function limb(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
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

function drawWeapon(ctx, kind, pal, glowPulse) {
  const blade = pal.blade || "#8a8f99";
  const grip = pal.grip || "#4a3527";
  ctx.save();
  if (pal.glow) {
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 10 + glowPulse * 6;
  }

  switch (kind) {
    case "dagger":
      limb(ctx, 0, 0, 0, 9, 5, grip);
      poly(ctx, [[-3, -1], [3, -1], [2, -26], [0, -31], [-2, -26]], blade);
      poly(ctx, [[-7, -2], [7, -2], [7, 1], [-7, 1]], shade(grip, 30));
      break;
    case "axe":
      limb(ctx, 0, 10, 0, -30, 6, grip);
      poly(ctx, [[1, -30], [20, -34], [26, -18], [16, -8], [2, -12]], blade);
      poly(ctx, [[-1, -30], [-16, -33], [-21, -20], [-13, -10], [-2, -13]], shade(blade, -25));
      break;
    case "hammer":
      limb(ctx, 0, 12, 0, -28, 7, grip);
      ctx.fillStyle = blade;
      ctx.fillRect(-17, -40, 34, 20);
      ctx.fillStyle = shade(blade, -35);
      ctx.fillRect(-17, -26, 34, 6);
      ctx.fillStyle = shade(blade, 25);
      ctx.fillRect(-17, -40, 34, 4);
      break;
    default: // sword
      limb(ctx, 0, 2, 0, 12, 5, grip);
      poly(ctx, [[-4, 0], [4, 0], [3, -38], [0, -46], [-3, -38]], blade);
      poly(ctx, [[-1.4, -2], [1.4, -2], [1.0, -38], [-1.0, -38]], shade(blade, 45));
      poly(ctx, [[-10, -3], [10, -3], [10, 1], [-10, 1]], shade(grip, 40));
      ellipse(ctx, 0, 13, 3.5, 3.5, shade(grip, 55));
      break;
  }
  ctx.restore();
}

/**
 * The hero: a knight wearing a bear-shaped harness. Everything is drawn from
 * primitives so equipment colours can change the look with no art assets.
 */
export function drawKnight(ctx, player, stats, time) {
  const pal = {
    helm: stats.palette.helm || DEFAULTS.helm,
    chest: stats.palette.chest || DEFAULTS.chest,
    legs: stats.palette.legs || DEFAULTS.legs,
    cloak: stats.palette.cloak || DEFAULTS.cloak,
    weapon: stats.palette.weapon || DEFAULTS.weapon,
  };

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
  const bob = running ? Math.abs(Math.sin(t * 13)) * 2.5 : breathe;
  const lean = running ? 5 : state === "dash" ? 16 : 0;

  let attackProgress = -1;
  if (state === "attack" || state === "heavy") {
    attackProgress = 1 - player.attackTimer / player.attackDuration;
  }

  const hipY = -26 - bob * 0.4;
  const shoulderY = -44 - bob;

  // ── Cloak ────────────────────────────────────────────────────────────────
  if (pal.cloak) {
    const sway = running ? runCycle * 8 : airborne ? -10 : Math.sin(t * 1.8) * 3;
    ctx.save();
    ctx.fillStyle = pal.cloak.main;
    ctx.beginPath();
    ctx.moveTo(-4, shoulderY - 4);
    ctx.quadraticCurveTo(-20 - sway, hipY, -14 - sway * 1.4, -2);
    ctx.lineTo(6 - sway * 0.6, -1);
    ctx.quadraticCurveTo(8, hipY - 4, 6, shoulderY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.cloak.trim;
    ctx.fillRect(-8, shoulderY - 6, 18, 4);
    ctx.restore();
  }

  // ── Back leg ─────────────────────────────────────────────────────────────
  const legSwing = running ? runCycle * 11 : airborne ? -6 : 0;
  const legSwing2 = running ? runCycle2 * 11 : airborne ? 7 : 0;
  const kneeLift = airborne ? 6 : 0;
  limb(ctx, -3, hipY, -4 + legSwing2 * 0.7, -12 - kneeLift, 9, shade(pal.legs.main, -30));
  limb(ctx, -4 + legSwing2 * 0.7, -12 - kneeLift, -5 + legSwing2, -1, 8, shade(pal.legs.main, -30));
  ellipse(ctx, -5 + legSwing2, -1.5, 6, 3, shade(pal.legs.trim, -20));

  // ── Back arm ─────────────────────────────────────────────────────────────
  const backArmAngle = running ? -runCycle * 0.6 : 0.25;
  ctx.save();
  ctx.translate(-5, shoulderY + 4);
  ctx.rotate(backArmAngle);
  limb(ctx, 0, 0, 0, 15, 7, shade(pal.chest.main, -40));
  limb(ctx, 0, 15, 3, 26, 6, shade(pal.chest.main, -50));
  ctx.restore();

  // ── Torso: bear-plate cuirass ────────────────────────────────────────────
  ctx.save();
  ctx.translate(0, 0);
  ctx.rotate((lean * Math.PI) / 180 * 0.12);

  poly(
    ctx,
    [
      [-11, shoulderY + 2],
      [11, shoulderY + 2],
      [13, hipY + 6],
      [9, hipY + 2],
      [-9, hipY + 2],
      [-13, hipY + 6],
    ],
    pal.chest.main
  );
  // fur collar
  ctx.fillStyle = pal.chest.fur || shade(pal.chest.main, -25);
  for (let i = -12; i <= 12; i += 4) {
    ellipse(ctx, i, shoulderY + 2, 4, 3.4, pal.chest.fur || shade(pal.chest.main, -25));
  }
  // bear muzzle emblem on the chest
  ctx.fillStyle = pal.chest.trim;
  ellipse(ctx, 1, shoulderY + 13, 7.5, 6.5, pal.chest.trim);
  ellipse(ctx, 1, shoulderY + 16, 3.4, 2.6, shade(pal.chest.trim, 45));
  ellipse(ctx, -3, shoulderY + 10.5, 1.4, 1.4, "#1a1216");
  ellipse(ctx, 5, shoulderY + 10.5, 1.4, 1.4, "#1a1216");
  // belt
  ctx.fillStyle = shade(pal.chest.trim, -10);
  ctx.fillRect(-11, hipY - 2, 22, 5);
  ctx.fillStyle = shade(pal.chest.trim, 60);
  ctx.fillRect(-3, hipY - 2.5, 6, 6);

  // ── Pauldron with claws ──────────────────────────────────────────────────
  ctx.save();
  ctx.translate(7, shoulderY + 3);
  ellipse(ctx, 0, 0, 9, 7.5, shade(pal.chest.main, 25));
  ctx.strokeStyle = shade(pal.chest.trim, 40);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(2 + i * 3, 2);
    ctx.quadraticCurveTo(7 + i * 3, 6, 5 + i * 3, 10);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();

  // ── Head: bear skull helm ────────────────────────────────────────────────
  const headY = shoulderY - 11;
  ctx.save();
  ctx.translate(1, headY);
  if (running) ctx.rotate(runCycle * 0.03);

  // ears
  ellipse(ctx, -7, -9, 4.2, 4.6, shade(pal.helm.main, -20));
  ellipse(ctx, 8, -9, 4.2, 4.6, shade(pal.helm.main, -20));
  ellipse(ctx, -7, -9, 2.2, 2.4, pal.helm.trim);
  ellipse(ctx, 8, -9, 2.2, 2.4, pal.helm.trim);

  // skull
  ellipse(ctx, 0.5, 0, 10, 9.5, pal.helm.main);
  // muzzle
  poly(
    ctx,
    [
      [4, -3],
      [16, -1],
      [17, 4],
      [13, 7],
      [4, 6],
    ],
    shade(pal.helm.main, 12)
  );
  ellipse(ctx, 16, 1.5, 2.4, 2.2, shade(pal.helm.trim, -20));

  // fangs
  poly(ctx, [[10, 6], [12, 6], [11, 12]], "#f2ece0");
  poly(ctx, [[13.5, 5.5], [15.5, 5.5], [14.2, 10.5]], "#f2ece0");

  // glowing eye socket
  const glow = 0.6 + Math.sin(time * 4) * 0.25;
  ctx.save();
  ctx.shadowColor = "#ff9a3d";
  ctx.shadowBlur = 12 * glow;
  ellipse(ctx, 6, -1.5, 2.8, 2.2, "#ffb14d");
  ellipse(ctx, -2, -2, 2.2, 1.8, "#ff8a2d");
  ctx.restore();

  // helm trim
  ctx.strokeStyle = pal.helm.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0.5, 0, 9.6, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();

  // ── Front leg ────────────────────────────────────────────────────────────
  limb(ctx, 3, hipY, 4 + legSwing * 0.7, -12 - kneeLift * 0.4, 9, pal.legs.main);
  limb(ctx, 4 + legSwing * 0.7, -12 - kneeLift * 0.4, 5 + legSwing, -1, 8, pal.legs.main);
  ellipse(ctx, 5 + legSwing, -1.5, 6.5, 3.2, pal.legs.trim);

  // ── Weapon arm ───────────────────────────────────────────────────────────
  let armAngle;
  if (attackProgress >= 0) {
    const heavy = state === "heavy";
    const windup = heavy ? 0.42 : 0.3;
    if (attackProgress < windup) {
      armAngle = -2.2 - (attackProgress / windup) * (heavy ? 1.0 : 0.6);
    } else {
      const swing = (attackProgress - windup) / (1 - windup);
      armAngle = -2.2 - (heavy ? 1.0 : 0.6) + swing * (heavy ? 4.4 : 3.6);
    }
    if (player.attackCombo === 1 && !heavy) armAngle = -armAngle * 0.6 + 0.6;
  } else if (running) {
    armAngle = 0.5 + runCycle * 0.55;
  } else if (airborne) {
    armAngle = 0.9;
  } else if (state === "dash") {
    armAngle = 1.9;
  } else {
    armAngle = 0.55 + Math.sin(t * 2.2) * 0.06;
  }

  ctx.save();
  ctx.translate(6, shoulderY + 5);
  ctx.rotate(armAngle);
  limb(ctx, 0, 0, 0, 14, 7.5, pal.chest.main);
  limb(ctx, 0, 14, 0, 24, 6.5, shade(pal.chest.main, 15));
  ctx.translate(0, 24);
  ctx.rotate(0.35);
  drawWeapon(ctx, stats.weaponKind, pal.weapon, Math.sin(time * 3) * 0.5 + 0.5);
  ctx.restore();

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
      poly(ctx, [[-11, -38], [0, -56], [11, -38], [0, -34]], c.body);
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
