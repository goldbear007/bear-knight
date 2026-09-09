import { getItem } from "../data/items.js";
import { SKILL_BY_ID } from "../data/skills.js";

export function findInvEntry(save, uid) {
  return save.inventory.find((e) => e.uid === uid) || null;
}

export function equippedItem(save, slot) {
  const uid = save.equipped[slot];
  if (!uid) return null;
  const entry = findInvEntry(save, uid);
  return entry ? getItem(entry.itemId) : null;
}

function baseStats() {
  return {
    maxHp: 120,
    maxHpMult: 1,
    maxStamina: 100,
    staminaRegenMult: 1,
    baseSpeed: 215,
    speedPct: 0,
    armor: 0,
    crit: 3,
    critDmg: 150,
    lifesteal: 0,
    goldFind: 0,
    soulFind: 0,
    luckPct: 0,
    damage: 5,
    damageMult: 1,
    attackSpeed: 1,
    rageDamage: 0,
    rageLifesteal: 0,
    canDash: false,
    maxJumps: 2,
    canAirDash: false,
    dashCharges: 1,
    dashDamage: 0,
    hasRoar: false,
    hasBolt: false,
    boltDamage: 0,
    wardPct: 0,
    hasNova: false,
    cooldownMult: 1,
    abilityPower: 0,
    weaponKind: "sword",
    weaponId: null,
    palette: {},
  };
}

/** Rolls equipment and skill ranks into the single stat block the game reads. */
export function computeStats(save) {
  const s = baseStats();
  const palette = {};

  for (const slot of ["weapon", "helm", "chest", "legs", "cloak"]) {
    const item = equippedItem(save, slot);
    if (!item) continue;
    palette[slot] = item.palette;
    if (slot === "weapon") {
      s.weaponKind = item.kind || "sword";
      s.weaponId = item.id;
      s.attackSpeed = item.stats.attackSpeed ?? 1;
    }
    for (const [key, value] of Object.entries(item.stats)) {
      if (key === "attackSpeed") continue;
      if (key === "speed") s.speedPct += value;
      else if (key in s) s[key] += value;
    }
  }
  s.palette = palette;

  for (const [id, rank] of Object.entries(save.skills || {})) {
    const skill = SKILL_BY_ID[id];
    if (skill && rank > 0) skill.apply(s, Math.min(rank, skill.maxRank));
  }

  s.maxHp = Math.round(s.maxHp * s.maxHpMult);
  s.maxStamina = Math.round(s.maxStamina);
  s.moveSpeed = s.baseSpeed * (1 + s.speedPct / 100);
  s.crit = Math.min(75, s.crit);
  return s;
}

export function spentSouls(save) {
  let total = 0;
  for (const [id, rank] of Object.entries(save.skills || {})) {
    const skill = SKILL_BY_ID[id];
    if (!skill) continue;
    for (let r = 0; r < rank; r++) total += Math.round(skill.cost * (1 + r * 0.8));
  }
  return total;
}

/** Cosmetic "level" derived from lifetime souls, used purely as a progress badge. */
export function heroLevel(save) {
  const total = save.souls + spentSouls(save);
  return 1 + Math.floor(Math.sqrt(total / 6));
}
