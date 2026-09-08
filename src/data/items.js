export const RARITY = {
  common: { name: "Обычное", color: "#9aa3b2", mult: 1 },
  uncommon: { name: "Необычное", color: "#5fbf6a", mult: 1.4 },
  rare: { name: "Редкое", color: "#4f8ef7", mult: 2.0 },
  epic: { name: "Эпическое", color: "#a765f0", mult: 3.0 },
  legendary: { name: "Легендарное", color: "#f0973a", mult: 4.5 },
};

export const SLOT_NAMES = {
  weapon: "Оружие",
  helm: "Шлем",
  chest: "Доспех",
  legs: "Поножи",
  cloak: "Плащ",
};

const W = (id, name, rarity, price, kind, stats, desc, palette) => ({
  id,
  name,
  slot: "weapon",
  rarity,
  price,
  kind,
  stats,
  desc,
  palette,
});

const A = (id, name, slot, rarity, price, stats, desc, palette) => ({
  id,
  name,
  slot,
  rarity,
  price,
  stats,
  desc,
  palette,
});

export const ITEMS = {};

[
  // ── Оружие ────────────────────────────────────────────────────────────────
  W("rusty-sword", "Ржавый клинок", "common", 0, "sword",
    { damage: 9, attackSpeed: 1.0, crit: 2 },
    "Он пережил трёх хозяев. Всем троим не повезло.",
    { blade: "#8a8f99", grip: "#4a3527", glow: null }),
  W("hunter-dagger", "Кинжал ловчего", "common", 140, "dagger",
    { damage: 6, attackSpeed: 1.7, crit: 12 },
    "Быстрый, тихий, беспощадный к спине.",
    { blade: "#b9c0cc", grip: "#3a2b1f", glow: null }),
  W("iron-longsword", "Железный длинный меч", "uncommon", 380, "sword",
    { damage: 15, attackSpeed: 0.98, crit: 5 },
    "Честная сталь без единого заклятия.",
    { blade: "#cfd6e2", grip: "#5b3a22", glow: null }),
  W("bear-claw-axe", "Топор медвежьего когтя", "uncommon", 560, "axe",
    { damage: 22, attackSpeed: 0.78, crit: 6, armor: 2 },
    "Выкован из клыка вожака стаи.",
    { blade: "#c2b9a4", grip: "#43301f", glow: null }),
  W("wolfbane-blade", "Волчья погибель", "rare", 980, "sword",
    { damage: 19, attackSpeed: 1.2, crit: 8, lifesteal: 5 },
    "Пьёт кровь зверя и делится ею с хозяином.",
    { blade: "#9fe0c0", grip: "#25332c", glow: "#63f0b4" }),
  W("grimhollow-maul", "Молот Мрачной лощины", "rare", 1250, "hammer",
    { damage: 36, attackSpeed: 0.55, crit: 3, armor: 4 },
    "Не рубит. Просто заканчивает спор.",
    { blade: "#7e7568", grip: "#33251a", glow: null }),
  W("moonfang-saber", "Сабля Лунного клыка", "epic", 2400, "dagger",
    { damage: 27, attackSpeed: 1.4, crit: 22, critDmg: 25 },
    "Лунный свет застыл на её лезвии.",
    { blade: "#d9e6ff", grip: "#2b2f4a", glow: "#9fc4ff" }),
  W("dread-bear-cleaver", "Тесак Ужасного медведя", "legendary", 4600, "axe",
    { damage: 48, attackSpeed: 0.92, crit: 15, lifesteal: 8, maxHp: 20 },
    "Реликвия последнего медвежьего короля.",
    { blade: "#ffd9a0", grip: "#4a1f1f", glow: "#ff8a3d" }),

  // ── Шлемы ─────────────────────────────────────────────────────────────────
  A("torn-hood", "Рваный капюшон", "helm", "common", 90,
    { armor: 2, speed: 2 },
    "Скрывает лицо. Больше почти ничего.",
    { main: "#3b3340", trim: "#26212c" }),
  A("bear-skull-helm", "Шлем из черепа медведя", "helm", "common", 0,
    { armor: 4, maxHp: 10 },
    "Твой первый трофей и твоё второе лицо.",
    { main: "#c9bda4", trim: "#6d5c44" }),
  A("iron-sallet", "Железный салад", "helm", "uncommon", 420,
    { armor: 8, maxHp: 15 },
    "Простой шлем солдата ордена.",
    { main: "#b5bcc9", trim: "#5c6472" }),
  A("grim-visage", "Мрачный лик", "helm", "rare", 1100,
    { armor: 12, crit: 6, maxHp: 20 },
    "Улыбка, вырезанная изнутри.",
    { main: "#6c5f7a", trim: "#2a2233" }),
  A("ursine-crown", "Корона Урсина", "helm", "epic", 2600,
    { armor: 18, maxHp: 40, soulFind: 15 },
    "Носить её значит принять голод медведя.",
    { main: "#e0c98a", trim: "#7a5a2a" }),

  // ── Доспехи ───────────────────────────────────────────────────────────────
  A("worn-bear-plate", "Потёртый медвежий доспех", "chest", "common", 0,
    { armor: 6, maxHp: 20 },
    "Мех вытерся, но сталь под ним ещё держит удар.",
    { main: "#6b5540", trim: "#3a2b1e", fur: "#4a3a2b" }),
  A("chain-hauberk", "Кольчужный хауберк", "chest", "uncommon", 520,
    { armor: 12, maxHp: 30, speed: -2 },
    "Тысяча колец против одного клыка.",
    { main: "#9aa2b0", trim: "#4c5461", fur: "#3c3f47" }),
  A("bear-plate", "Медвежий доспех стража", "chest", "rare", 1400,
    { armor: 20, maxHp: 55, maxStamina: 15 },
    "Настоящая броня медвежьих рыцарей севера.",
    { main: "#8a6a45", trim: "#4a3320", fur: "#5b4632" }),
  A("obsidian-cuirass", "Обсидиановая кираса", "chest", "epic", 3000,
    { armor: 30, maxHp: 80, lifesteal: 3 },
    "Холодная, как выдох склепа.",
    { main: "#3a3550", trim: "#1c1a2b", fur: "#2a2740" }),
  A("ursine-aegis", "Эгида Урсина", "chest", "legendary", 5400,
    { armor: 42, maxHp: 120, maxStamina: 25 },
    "Медведь не умер. Он просто стал бронёй.",
    { main: "#c08b4a", trim: "#5c3a18", fur: "#7a5227" }),

  // ── Поножи ────────────────────────────────────────────────────────────────
  A("cloth-wraps", "Тканевые обмотки", "legs", "common", 70,
    { armor: 2, speed: 4 },
    "Легко бежать, легко умереть.",
    { main: "#5a5048", trim: "#3a332d" }),
  A("iron-greaves", "Железные поножи", "legs", "uncommon", 400,
    { armor: 9, maxHp: 15 },
    "Тяжёлый шаг слышно за поворот.",
    { main: "#a3aab7", trim: "#565d6a" }),
  A("bear-fur-greaves", "Поножи из медвежьего меха", "legs", "rare", 1150,
    { armor: 14, maxHp: 25, maxStamina: 20, speed: 3 },
    "Тёплые даже в Пепельных пустошах.",
    { main: "#7a5f42", trim: "#43331f" }),
  A("warden-legguards", "Наголенники Хранителя", "legs", "epic", 2700,
    { armor: 22, maxHp: 45, speed: 6 },
    "Хранители не отступали. Они уходили спокойно.",
    { main: "#4f6a5e", trim: "#25332c" }),

  // ── Плащи ─────────────────────────────────────────────────────────────────
  A("tattered-cloak", "Истрёпанный плащ", "cloak", "common", 80,
    { armor: 1, goldFind: 5 },
    "Пахнет дымом и дорогой.",
    { main: "#4a3f4f", trim: "#2a232f" }),
  A("hunters-mantle", "Мантия ловчего", "cloak", "uncommon", 460,
    { armor: 4, crit: 5, speed: 4 },
    "Ткань, что не шуршит в подлеске.",
    { main: "#3f5a44", trim: "#22301f" }),
  A("bear-pelt-cloak", "Плащ из медвежьей шкуры", "cloak", "rare", 1300,
    { armor: 10, maxHp: 35, soulFind: 10 },
    "Голова зверя всё ещё смотрит назад.",
    { main: "#6b4a30", trim: "#3a2617" }),
  A("shadowweave-shroud", "Саван из теневой пряжи", "cloak", "epic", 2900,
    { armor: 14, crit: 10, lifesteal: 4, goldFind: 20 },
    "Соткан там, где не бывает света.",
    { main: "#2f2a44", trim: "#171426" }),
  A("aurora-mantle", "Мантия северного зарева", "cloak", "legendary", 5000,
    { armor: 20, maxHp: 60, crit: 12, soulFind: 25, goldFind: 25 },
    "Небо над мёртвым лесом однажды было таким.",
    { main: "#2e6b6b", trim: "#123232" }),
].forEach((item) => {
  ITEMS[item.id] = item;
});

export const POTIONS = {
  "minor-elixir": {
    id: "minor-elixir",
    name: "Малый эликсир",
    price: 45,
    heal: 45,
    color: "#e0554f",
    desc: "Восстанавливает 45 здоровья.",
  },
  "greater-elixir": {
    id: "greater-elixir",
    name: "Большой эликсир",
    price: 120,
    heal: 110,
    color: "#f07a4f",
    desc: "Восстанавливает 110 здоровья.",
  },
  "soul-tincture": {
    id: "soul-tincture",
    name: "Настойка душ",
    price: 200,
    heal: 60,
    souls: 15,
    color: "#7fd6ff",
    desc: "Лечит 60 здоровья и даёт 15 душ.",
  },
};

export const getItem = (id) => ITEMS[id] || null;
export const rarityColor = (id) => RARITY[getItem(id)?.rarity || "common"].color;

/** Sell price is a flat 40% of the shop price so buying back always costs something. */
export const sellValue = (id) => Math.max(5, Math.floor((getItem(id)?.price || 0) * 0.4));

export const STAT_LABELS = {
  damage: "Урон",
  attackSpeed: "Скорость атаки",
  crit: "Шанс крита",
  critDmg: "Урон крита",
  armor: "Броня",
  maxHp: "Здоровье",
  maxStamina: "Выносливость",
  speed: "Скорость",
  lifesteal: "Вампиризм",
  goldFind: "Золото",
  soulFind: "Души",
};

export function formatStat(key, value) {
  const percentKeys = ["crit", "critDmg", "speed", "lifesteal", "goldFind", "soulFind"];
  if (key === "attackSpeed") return `${value >= 1 ? "" : ""}x${value.toFixed(2)}`;
  const sign = value > 0 ? "+" : "";
  return percentKeys.includes(key) ? `${sign}${value}%` : `${sign}${value}`;
}
