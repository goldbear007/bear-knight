import { Telegram } from "./telegram.js";

const SAVE_VERSION = 1;
const KEY = () => `bearknight_save_${Telegram.userKey}`;

const cloud = Telegram.raw?.CloudStorage;

function cloudGet(key) {
  return new Promise((resolve) => {
    try {
      cloud.getItem(key, (err, value) => resolve(err ? null : value || null));
    } catch {
      resolve(null);
    }
  });
}

function cloudSet(key, value) {
  return new Promise((resolve) => {
    try {
      cloud.setItem(key, value, (err) => resolve(!err));
    } catch {
      resolve(false);
    }
  });
}

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    gold: 60,
    souls: 0,
    skills: {},
    inventory: [
      { uid: "start-weapon", itemId: "rusty-sword" },
      { uid: "start-chest", itemId: "worn-bear-plate" },
      { uid: "start-helm", itemId: "bear-skull-helm" },
    ],
    equipped: {
      weapon: "start-weapon",
      helm: "start-helm",
      chest: "start-chest",
      legs: null,
      cloak: null,
    },
    potions: { "minor-elixir": 3 },
    unlockedLevels: 1,
    clearedLevels: [],
    stats: { kills: 0, deaths: 0, runs: 0, playtimeMs: 0, bossKills: 0, lootFound: 0 },
    settings: { muted: false },
  };
}

const SLOTS = ["weapon", "helm", "chest", "legs", "cloak"];

/**
 * Telegram CloudStorage caps a value at 4096 bytes, so the stored form keeps only
 * item ids plus equipment indices instead of the full runtime objects with uids.
 */
function encode(state) {
  const index = new Map(state.inventory.map((entry, i) => [entry.uid, i]));
  return {
    v: SAVE_VERSION,
    g: Math.round(state.gold),
    s: Math.round(state.souls),
    sk: state.skills,
    p: state.potions,
    u: state.unlockedLevels,
    c: state.clearedLevels,
    st: {
      k: state.stats.kills,
      d: state.stats.deaths,
      r: state.stats.runs,
      t: Math.round(state.stats.playtimeMs),
      b: state.stats.bossKills,
      l: state.stats.lootFound,
    },
    m: state.settings.muted ? 1 : 0,
    inv: state.inventory.map((e) => e.itemId),
    eq: SLOTS.map((slot) => (state.equipped[slot] != null ? index.get(state.equipped[slot]) ?? -1 : -1)),
  };
}

function decode(data) {
  const base = createDefaultSave();
  const inventory = (data.inv || []).map((itemId, i) => ({ uid: `i${i}`, itemId }));
  const equipped = {};
  SLOTS.forEach((slot, i) => {
    const idx = data.eq?.[i] ?? -1;
    equipped[slot] = idx >= 0 && inventory[idx] ? inventory[idx].uid : null;
  });
  const st = data.st || {};
  return {
    ...base,
    version: SAVE_VERSION,
    gold: data.g ?? base.gold,
    souls: data.s ?? 0,
    skills: data.sk || {},
    potions: data.p || {},
    unlockedLevels: data.u || 1,
    clearedLevels: Array.isArray(data.c) ? data.c : [],
    inventory: inventory.length ? inventory : base.inventory,
    equipped: inventory.length ? equipped : base.equipped,
    stats: {
      kills: st.k || 0,
      deaths: st.d || 0,
      runs: st.r || 0,
      playtimeMs: st.t || 0,
      bossKills: st.b || 0,
      lootFound: st.l || 0,
    },
    settings: { muted: Boolean(data.m) },
  };
}

function migrate(data) {
  const base = createDefaultSave();
  if (!data || typeof data !== "object") return base;
  if (Array.isArray(data.inv)) return decode(data);
  const merged = {
    ...base,
    ...data,
    equipped: { ...base.equipped, ...(data.equipped || {}) },
    potions: { ...(data.potions || {}) },
    stats: { ...base.stats, ...(data.stats || {}) },
    settings: { ...base.settings, ...(data.settings || {}) },
    skills: { ...(data.skills || {}) },
  };
  if (!Array.isArray(merged.inventory) || merged.inventory.length === 0) {
    merged.inventory = base.inventory;
    merged.equipped = base.equipped;
  }
  if (!Array.isArray(merged.clearedLevels)) merged.clearedLevels = [];
  merged.version = SAVE_VERSION;
  return merged;
}

export const SaveStore = {
  /** Where the last successful write landed, shown in the pause menu. */
  backend: cloud ? "Telegram Cloud" : "браузер",

  async load() {
    let raw = null;
    if (cloud) raw = await cloudGet(KEY());
    if (!raw) {
      try {
        raw = localStorage.getItem(KEY());
      } catch {
        raw = null;
      }
    }
    if (!raw) return createDefaultSave();
    try {
      return migrate(JSON.parse(raw));
    } catch {
      return createDefaultSave();
    }
  },

  async save(state) {
    const raw = JSON.stringify(encode(state));
    try {
      localStorage.setItem(KEY(), raw);
    } catch {
      /* private mode / quota — cloud copy below may still succeed */
    }
    if (cloud && raw.length < 4000) {
      const ok = await cloudSet(KEY(), raw);
      this.backend = ok ? "Telegram Cloud" : "браузер";
    } else if (cloud) {
      this.backend = "браузер (сейв слишком большой для облака)";
    }
    return true;
  },

  async wipe() {
    try {
      localStorage.removeItem(KEY());
    } catch {
      /* nothing to clean up */
    }
    if (cloud) await new Promise((r) => cloud.removeItem(KEY(), () => r()));
    return createDefaultSave();
  },
};
