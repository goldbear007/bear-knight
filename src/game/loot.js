import { ITEMS, RARITY } from "../data/items.js";
import { uid } from "../core/utils.js";

const DROPPABLE = Object.values(ITEMS).filter((i) => i.price > 0);

const TIER_WEIGHTS = {
  1: { common: 70, uncommon: 25, rare: 5, epic: 0.5, legendary: 0 },
  2: { common: 52, uncommon: 33, rare: 12, epic: 2.5, legendary: 0.3 },
  3: { common: 34, uncommon: 35, rare: 22, epic: 7, legendary: 1.2 },
  4: { common: 20, uncommon: 32, rare: 29, epic: 15, legendary: 4 },
  5: { common: 8, uncommon: 24, rare: 33, epic: 25, legendary: 10 },
};

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

/** Luck shifts weight from the two lowest rarities toward the top three. */
function weightsFor(tier, luckPct) {
  const base = { ...(TIER_WEIGHTS[tier] || TIER_WEIGHTS[1]) };
  const shift = Math.min(0.6, luckPct / 100);
  const taken = (base.common + base.uncommon) * shift;
  base.common *= 1 - shift;
  base.uncommon *= 1 - shift * 0.5;
  base.rare += taken * 0.55;
  base.epic += taken * 0.33;
  base.legendary += taken * 0.12;
  return base;
}

export function rollRarity(tier, luckPct = 0) {
  const weights = weightsFor(tier, luckPct);
  const total = RARITY_ORDER.reduce((sum, r) => sum + (weights[r] || 0), 0);
  let roll = Math.random() * total;
  for (const r of RARITY_ORDER) {
    roll -= weights[r] || 0;
    if (roll <= 0) return r;
  }
  return "common";
}

export function rollItemId(tier, luckPct = 0, minRarity = null) {
  let rarity = rollRarity(tier, luckPct);
  if (minRarity && RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(minRarity)) {
    rarity = minRarity;
  }
  let pool = DROPPABLE.filter((i) => i.rarity === rarity);
  while (pool.length === 0 && rarity !== "common") {
    rarity = RARITY_ORDER[RARITY_ORDER.indexOf(rarity) - 1];
    pool = DROPPABLE.filter((i) => i.rarity === rarity);
  }
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
}

const range = ([a, b]) => Math.round(a + Math.random() * (b - a));

/**
 * Everything an enemy leaves behind. Bosses always drop gear, elites usually do,
 * regular mobs mostly hand out gold and souls.
 */
export function rollEnemyDrop(type, level, stats) {
  const goldMult = (1 + (stats.goldFind || 0) / 100) * (0.7 + level.difficulty * 0.4);
  const soulMult = (1 + (stats.soulFind || 0) / 100) * (0.8 + level.difficulty * 0.25);
  const drop = {
    gold: Math.max(1, Math.round(range(type.gold) * goldMult)),
    souls: Math.max(1, Math.round(range(type.souls) * soulMult)),
    items: [],
  };

  const luck = stats.luckPct || 0;
  if (type.boss) {
    drop.items.push(rollItemId(level.tier, luck + 60, "rare"));
    drop.items.push(rollItemId(level.tier, luck + 30, "uncommon"));
    if (Math.random() < 0.5) drop.items.push(rollItemId(level.tier, luck, null));
  } else if (type.elite) {
    if (Math.random() < 0.45 + luck / 300) drop.items.push(rollItemId(level.tier, luck, "uncommon"));
  } else if (Math.random() < 0.1 + luck / 400) {
    drop.items.push(rollItemId(level.tier, luck, null));
  }

  drop.items = drop.items.filter(Boolean);
  return drop;
}

export function rollChestDrop(level, stats) {
  const luck = stats.luckPct || 0;
  const items = [rollItemId(level.tier, luck + 20, "uncommon")];
  if (Math.random() < 0.35) items.push(rollItemId(level.tier, luck, null));
  return {
    gold: Math.round((40 + Math.random() * 60) * level.difficulty * (1 + (stats.goldFind || 0) / 100)),
    souls: Math.round((3 + Math.random() * 5) * level.difficulty * (1 + (stats.soulFind || 0) / 100)),
    items: items.filter(Boolean),
  };
}

export function addToInventory(save, itemId) {
  const entry = { uid: uid(), itemId };
  save.inventory.push(entry);
  save.stats.lootFound = (save.stats.lootFound || 0) + 1;
  return entry;
}

export const rarityRank = (rarity) => RARITY_ORDER.indexOf(rarity);
export const rarityMeta = (rarity) => RARITY[rarity] || RARITY.common;
