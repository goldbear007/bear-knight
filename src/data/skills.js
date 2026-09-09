export const BRANCHES = {
  ursa: {
    id: "ursa",
    name: "Урса",
    subtitle: "Путь Медведя",
    color: "#d98a3d",
    desc: "Сила, живучесть и звериная ярость.",
  },
  hunt: {
    id: "hunt",
    name: "Ловчий",
    subtitle: "Путь Охоты",
    color: "#5fbf8a",
    desc: "Скорость, рывки и точные удары.",
  },
  umbra: {
    id: "umbra",
    name: "Умбра",
    subtitle: "Путь Тьмы",
    color: "#9a6ef0",
    desc: "Тёмная магия, вампиризм и жадность.",
  },
};

/**
 * Nodes are laid out on a 3-wide grid per branch (col 0..2, row 0..4);
 * the skill tree screen draws links from `requires` between those slots.
 */
export const SKILLS = [
  // ── Урса ──────────────────────────────────────────────────────────────────
  {
    id: "ursa-vigor",
    branch: "ursa",
    name: "Медвежья мощь",
    col: 1, row: 0, maxRank: 3, cost: 2, icon: "heart",
    desc: (r) => `+${25 * r} к максимальному здоровью`,
    apply: (s, r) => { s.maxHp += 25 * r; },
    requires: [],
  },
  {
    id: "ursa-might",
    branch: "ursa",
    name: "Тяжёлая лапа",
    col: 0, row: 1, maxRank: 3, cost: 3, icon: "sword",
    desc: (r) => `+${8 * r}% к урону оружия`,
    apply: (s, r) => { s.damageMult += 0.08 * r; },
    requires: [{ id: "ursa-vigor", rank: 1 }],
  },
  {
    id: "ursa-hide",
    branch: "ursa",
    name: "Шкура зверя",
    col: 2, row: 1, maxRank: 3, cost: 3, icon: "shield",
    desc: (r) => `+${5 * r} брони`,
    apply: (s, r) => { s.armor += 5 * r; },
    requires: [{ id: "ursa-vigor", rank: 1 }],
  },
  {
    id: "ursa-endurance",
    branch: "ursa",
    name: "Выносливость",
    col: 0, row: 2, maxRank: 2, cost: 4, icon: "bolt",
    desc: (r) => `+${25 * r} выносливости, +${15 * r}% к её восстановлению`,
    apply: (s, r) => { s.maxStamina += 25 * r; s.staminaRegenMult += 0.15 * r; },
    requires: [{ id: "ursa-might", rank: 1 }],
  },
  {
    id: "ursa-roar",
    branch: "ursa",
    name: "Рёв Урсы",
    col: 2, row: 2, maxRank: 1, cost: 6, icon: "roar",
    desc: () => "Открывает Рёв (Q): оглушает и отбрасывает врагов вокруг",
    apply: (s) => { s.hasRoar = true; },
    requires: [{ id: "ursa-hide", rank: 1 }],
  },
  {
    id: "ursa-rage",
    branch: "ursa",
    name: "Кровавая ярость",
    col: 1, row: 3, maxRank: 2, cost: 7, icon: "rage",
    desc: (r) => `Ниже 35% здоровья: +${20 * r}% урона и +${10 * r}% вампиризма`,
    apply: (s, r) => { s.rageDamage += 0.2 * r; s.rageLifesteal += 10 * r; },
    requires: [{ id: "ursa-endurance", rank: 1 }, { id: "ursa-roar", rank: 1 }],
  },
  {
    id: "ursa-titan",
    branch: "ursa",
    name: "Медвежий король",
    col: 1, row: 4, maxRank: 1, cost: 12, icon: "crown",
    desc: () => "+15% к максимальному здоровью и +10% ко всему урону",
    apply: (s) => { s.maxHpMult += 0.15; s.damageMult += 0.1; },
    requires: [{ id: "ursa-rage", rank: 1 }],
  },

  // ── Ловчий ────────────────────────────────────────────────────────────────
  {
    id: "hunt-swift",
    branch: "hunt",
    name: "Лёгкий шаг",
    col: 1, row: 0, maxRank: 3, cost: 2, icon: "boot",
    desc: (r) => `+${6 * r}% к скорости передвижения`,
    apply: (s, r) => { s.speedPct += 6 * r; },
    requires: [],
  },
  {
    id: "hunt-dash",
    branch: "hunt",
    name: "Рывок",
    col: 0, row: 1, maxRank: 1, cost: 5, icon: "dash",
    desc: () => "Открывает Рывок (Shift): быстрый бросок с неуязвимостью",
    apply: (s) => { s.canDash = true; },
    requires: [{ id: "hunt-swift", rank: 1 }],
  },
  {
    id: "hunt-precision",
    branch: "hunt",
    name: "Точность",
    col: 2, row: 1, maxRank: 3, cost: 3, icon: "eye",
    desc: (r) => `+${7 * r}% к шансу критического удара`,
    apply: (s, r) => { s.crit += 7 * r; },
    requires: [{ id: "hunt-swift", rank: 1 }],
  },
  {
    id: "hunt-doublejump",
    branch: "hunt",
    name: "Воздушный шаг",
    col: 0, row: 2, maxRank: 1, cost: 6, icon: "wing",
    desc: () => "Ещё один прыжок в воздухе (третий)",
    apply: (s) => { s.maxJumps += 1; },
    requires: [{ id: "hunt-dash", rank: 1 }],
  },
  {
    id: "hunt-eviscerate",
    branch: "hunt",
    name: "Потрошитель",
    col: 2, row: 2, maxRank: 2, cost: 5, icon: "dagger",
    desc: (r) => `+${35 * r}% к урону критических ударов`,
    apply: (s, r) => { s.critDmg += 35 * r; },
    requires: [{ id: "hunt-precision", rank: 2 }],
  },
  {
    id: "hunt-dashstrike",
    branch: "hunt",
    name: "Удар в рывке",
    col: 1, row: 3, maxRank: 2, cost: 7, icon: "slash",
    desc: (r) => `Рывок наносит ${40 + 25 * r}% урона оружия задетым врагам`,
    apply: (s, r) => { s.dashDamage = 0.4 + 0.25 * r; },
    requires: [{ id: "hunt-doublejump", rank: 1 }],
  },
  {
    id: "hunt-airdash",
    branch: "hunt",
    name: "Ветряная поступь",
    col: 1, row: 4, maxRank: 1, cost: 12, icon: "wind",
    desc: () => "Рывок работает в воздухе и получает второй заряд",
    apply: (s) => { s.canAirDash = true; s.dashCharges += 1; },
    requires: [{ id: "hunt-dashstrike", rank: 1 }],
  },

  // ── Умбра ─────────────────────────────────────────────────────────────────
  {
    id: "umbra-siphon",
    branch: "umbra",
    name: "Похищение жизни",
    col: 1, row: 0, maxRank: 3, cost: 2, icon: "drop",
    desc: (r) => `+${3 * r}% вампиризма`,
    apply: (s, r) => { s.lifesteal += 3 * r; },
    requires: [],
  },
  {
    id: "umbra-bolt",
    branch: "umbra",
    name: "Теневой сгусток",
    col: 0, row: 1, maxRank: 3, cost: 4, icon: "orb",
    desc: (r) => `Открывает Сгусток (E), урон ${20 + 14 * r}`,
    apply: (s, r) => { s.hasBolt = true; s.boltDamage = 20 + 14 * r; },
    requires: [{ id: "umbra-siphon", rank: 1 }],
  },
  {
    id: "umbra-greed",
    branch: "umbra",
    name: "Жадность",
    col: 2, row: 1, maxRank: 3, cost: 3, icon: "coin",
    desc: (r) => `+${15 * r}% золота с врагов и сундуков`,
    apply: (s, r) => { s.goldFind += 15 * r; },
    requires: [{ id: "umbra-siphon", rank: 1 }],
  },
  {
    id: "umbra-ward",
    branch: "umbra",
    name: "Теневой оберег",
    col: 0, row: 2, maxRank: 2, cost: 6, icon: "ward",
    desc: (r) => `Щит на ${15 * r}% здоровья, восстанавливается за 12 сек без урона`,
    apply: (s, r) => { s.wardPct += 0.15 * r; },
    requires: [{ id: "umbra-bolt", rank: 1 }],
  },
  {
    id: "umbra-harvest",
    branch: "umbra",
    name: "Жатва душ",
    col: 2, row: 2, maxRank: 2, cost: 5, icon: "soul",
    desc: (r) => `+${20 * r}% душ и +${5 * r}% шанс редкого лута`,
    apply: (s, r) => { s.soulFind += 20 * r; s.luckPct += 5 * r; },
    requires: [{ id: "umbra-greed", rank: 1 }],
  },
  {
    id: "umbra-nova",
    branch: "umbra",
    name: "Взрыв тьмы",
    col: 1, row: 3, maxRank: 1, cost: 8, icon: "nova",
    desc: () => "Получая урон, выбрасывает волну тьмы вокруг себя",
    apply: (s) => { s.hasNova = true; },
    requires: [{ id: "umbra-ward", rank: 1 }, { id: "umbra-harvest", rank: 1 }],
  },
  {
    id: "umbra-eclipse",
    branch: "umbra",
    name: "Затмение",
    col: 1, row: 4, maxRank: 1, cost: 12, icon: "eclipse",
    desc: () => "-25% к перезарядке способностей и +30% к их урону",
    apply: (s) => { s.cooldownMult *= 0.75; s.abilityPower += 0.3; },
    requires: [{ id: "umbra-nova", rank: 1 }],
  },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

/** Souls needed to buy the next rank; later ranks cost progressively more. */
export function rankCost(skill, currentRank) {
  return Math.round(skill.cost * (1 + currentRank * 0.8));
}

export function meetsRequirements(skill, skillRanks) {
  return skill.requires.every((req) => (skillRanks[req.id] || 0) >= req.rank);
}
