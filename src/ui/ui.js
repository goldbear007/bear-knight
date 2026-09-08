import { ITEMS, POTIONS, RARITY, SLOT_NAMES, STAT_LABELS, getItem, sellValue, formatStat } from "../data/items.js";
import { SKILLS, BRANCHES, SKILL_BY_ID, rankCost, meetsRequirements } from "../data/skills.js";
import { LEVELS } from "../data/levels.js";
import { computeStats, equippedItem, heroLevel, spentSouls } from "../game/stats.js";
import { icon, SLOT_ICON, WEAPON_ICON } from "./icons.js";
import { Sfx } from "../core/audio.js";
import { Telegram } from "../core/telegram.js";
import { SaveStore, createDefaultSave } from "../core/save.js";
import { formatNum } from "../core/utils.js";

const SLOTS = ["weapon", "helm", "chest", "legs", "cloak"];

export class UI {
  constructor(root, bannerEl) {
    this.root = root;
    this.banner = bannerEl;
    this.game = null;
    this.shopTab = "weapon";
    this.gearFilter = "all";
    this.bannerTimer = null;

    this.root.addEventListener("click", (e) => this.onClick(e));
  }

  setGame(game) {
    this.game = game;
  }

  get save() {
    return this.game.save;
  }

  // ── Screen plumbing ───────────────────────────────────────────────────────

  hideAll() {
    this.root.innerHTML = "";
    this.root.classList.add("hidden");
    document.body.classList.remove("menu-open");
  }

  render(html, { wide = false } = {}) {
    this.root.className = `overlay${wide ? " overlay--wide" : ""}`;
    this.root.innerHTML = html;
    this.root.scrollTop = 0;
    document.body.classList.add("menu-open");
  }

  showBanner(title, subtitle = "") {
    this.banner.innerHTML = `<div class="banner-title">${title}</div><div class="banner-sub">${subtitle}</div>`;
    this.banner.classList.add("show");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner.classList.remove("show"), 2600);
  }

  refreshHeader() {
    const el = this.root.querySelector("[data-purse]");
    if (el) el.innerHTML = this.purseHtml();
  }

  purseHtml() {
    return `
      <span class="purse-item gold">${icon("coin", 16, "#ffcf5f")} ${formatNum(this.save.gold)}</span>
      <span class="purse-item souls">${icon("soul", 16, "#7fd6ff")} ${formatNum(this.save.souls)}</span>`;
  }

  onClick(e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const { act, id, slot, tab } = btn.dataset;
    Sfx.ensure();

    const actions = {
      hub: () => this.game.returnToHub(),
      shop: () => this.showShop(),
      gear: () => this.showGear(),
      tree: () => this.showTree(),
      pause: () => this.showPause(),
      resume: () => this.game.resume(),
      settings: () => this.showSettings(),
      start: () => this.game.startLevel(Number(id)),
      retry: () => this.game.startLevel(this.game.level.id),
      respawn: () => this.game.respawnAtCheckpoint(),
      buy: () => this.buyItem(id),
      buyPotion: () => this.buyPotion(id),
      sell: () => this.sellItem(id),
      equip: () => this.equipItem(id),
      unequip: () => this.unequipSlot(slot),
      learn: () => this.learnSkill(id),
      shopTab: () => {
        this.shopTab = tab;
        this.showShop();
      },
      gearFilter: () => {
        this.gearFilter = tab;
        this.showGear();
      },
      mute: () => {
        Sfx.setMuted(!Sfx.muted);
        this.save.settings.muted = Sfx.muted;
        this.game.saveGame();
        this.showSettings();
      },
      wipe: () => this.wipeSave(),
      nextLevel: () => {
        const next = this.game.level.id + 1;
        if (next < LEVELS.length && this.save.unlockedLevels > next) this.game.startLevel(next);
        else this.game.returnToHub();
      },
    };

    const fn = actions[act];
    if (fn) {
      Telegram.haptic("light");
      fn();
    }
  }

  // ── Hub ───────────────────────────────────────────────────────────────────

  showHub(reason = "") {
    const save = this.save;
    const stats = computeStats(save);
    const lvl = heroLevel(save);
    const cards = LEVELS.map((level) => {
      const unlocked = save.unlockedLevels > level.id;
      const cleared = save.clearedLevels.includes(level.id);
      const skulls = "◆".repeat(Math.min(5, Math.round(level.difficulty * 1.4)));
      return `
        <article class="level-card${unlocked ? "" : " locked"}${cleared ? " cleared" : ""}">
          <div class="level-card__art" style="--a:${level.palette.accent};--b:${level.palette.sky[1]}"></div>
          <div class="level-card__body">
            <h3>${level.name}</h3>
            <p>${level.subtitle}</p>
            <div class="level-card__meta">
              <span class="danger">${skulls}</span>
              ${level.boss ? '<span class="tag tag--boss">Босс</span>' : ""}
              ${cleared ? '<span class="tag tag--done">Пройден</span>' : ""}
            </div>
          </div>
          ${
            unlocked
              ? `<button class="btn btn--primary" data-act="start" data-id="${level.id}">В поход</button>`
              : `<button class="btn" disabled>Закрыто</button>`
          }
        </article>`;
    }).join("");

    const playtime = Math.floor((save.stats.playtimeMs || 0) / 60000);

    this.render(
      `
      <div class="screen screen--hub">
        <header class="screen-head">
          <div>
            <p class="eyebrow">Лагерь у костра</p>
            <h1>${Telegram.playerName}, рыцарь в медвежьем доспехе</h1>
          </div>
          <div class="purse" data-purse>${this.purseHtml()}</div>
        </header>

        ${reason ? `<div class="notice">${reason}</div>` : ""}

        <section class="hero-strip">
          <div class="hero-card">
            <div class="hero-card__badge">${lvl}</div>
            <div>
              <strong>Уровень героя</strong>
              <span>${formatNum(save.souls + spentSouls(save))} душ собрано</span>
            </div>
          </div>
          <div class="hero-stats">
            <span>${icon("heart", 15, "#e05a5a")} ${stats.maxHp}</span>
            <span>${icon("sword", 15, "#d9d3c2")} ${stats.damage}</span>
            <span>${icon("shield", 15, "#8fb8ff")} ${stats.armor}</span>
            <span>${icon("eye", 15, "#ffd45f")} ${stats.crit.toFixed(0)}%</span>
          </div>
          <nav class="hub-nav">
            <button class="btn" data-act="gear">${icon("chest", 16)} Снаряжение</button>
            <button class="btn" data-act="shop">${icon("coin", 16)} Магазин</button>
            <button class="btn" data-act="tree">${icon("nova", 16)} Умения</button>
            <button class="btn btn--ghost" data-act="settings">Настройки</button>
          </nav>
        </section>

        <h2 class="section-title">Земли Севера</h2>
        <div class="level-grid">${cards}</div>

        <footer class="hub-foot">
          Убито врагов: ${save.stats.kills} · Смертей: ${save.stats.deaths} · Боссов: ${save.stats.bossKills} ·
          Трофеев: ${save.stats.lootFound || 0} · В игре: ${playtime} мин · Сохранение: ${SaveStore.backend}
        </footer>
      </div>`,
      { wide: true }
    );
  }

  // ── Shop ──────────────────────────────────────────────────────────────────

  showShop() {
    const tabs = [
      { id: "weapon", label: "Оружие" },
      { id: "armor", label: "Броня" },
      { id: "potion", label: "Зелья" },
      { id: "sell", label: "Продажа" },
    ];

    let body = "";
    if (this.shopTab === "potion") {
      body = `<div class="item-grid">${Object.values(POTIONS)
        .map((p) => {
          const owned = this.save.potions[p.id] || 0;
          const afford = this.save.gold >= p.price;
          return `
          <article class="item-card">
            <div class="item-card__icon" style="--c:${p.color}">${icon("potion", 26, p.color)}</div>
            <div class="item-card__main">
              <h4 style="color:${p.color}">${p.name}</h4>
              <p class="item-desc">${p.desc}</p>
              <p class="item-owned">В сумке: ${owned}</p>
            </div>
            <button class="btn btn--buy${afford ? "" : " btn--off"}" data-act="buyPotion" data-id="${p.id}">
              ${icon("coin", 14, "#ffcf5f")} ${p.price}
            </button>
          </article>`;
        })
        .join("")}</div>`;
    } else if (this.shopTab === "sell") {
      const entries = this.save.inventory.filter((e) => !Object.values(this.save.equipped).includes(e.uid));
      body = entries.length
        ? `<div class="item-grid">${entries.map((e) => this.itemCard(e, "sell")).join("")}</div>`
        : `<p class="empty">Всё лишнее уже продано. Иди и добудь ещё.</p>`;
    } else {
      const wanted = this.shopTab === "weapon" ? ["weapon"] : ["helm", "chest", "legs", "cloak"];
      const list = Object.values(ITEMS)
        .filter((i) => wanted.includes(i.slot) && i.price > 0)
        .sort((a, b) => a.price - b.price);
      body = `<div class="item-grid">${list.map((i) => this.itemCard({ itemId: i.id }, "buy")).join("")}</div>`;
    }

    this.render(
      `
      <div class="screen">
        <header class="screen-head">
          <div>
            <p class="eyebrow">Торговец с перекрёстка</p>
            <h1>Лавка</h1>
          </div>
          <div class="purse" data-purse>${this.purseHtml()}</div>
        </header>
        <div class="tabs">
          ${tabs
            .map(
              (t) =>
                `<button class="tab${this.shopTab === t.id ? " is-active" : ""}" data-act="shopTab" data-tab="${t.id}">${t.label}</button>`
            )
            .join("")}
        </div>
        ${body}
        <div class="screen-foot"><button class="btn" data-act="${this.backAction()}">Назад</button></div>
      </div>`,
      { wide: true }
    );
  }

  backAction() {
    return this.game.state === "paused" ? "pause" : "hub";
  }

  itemCard(entry, mode) {
    const item = getItem(entry.itemId);
    if (!item) return "";
    const rarity = RARITY[item.rarity];
    const iconName = item.slot === "weapon" ? WEAPON_ICON[item.kind] || "sword" : SLOT_ICON[item.slot];
    const equipped = entry.uid && Object.values(this.save.equipped).includes(entry.uid);
    const current = equippedItem(this.save, item.slot);
    const stats = Object.entries(item.stats)
      .map(([k, v]) => {
        const delta = current && current.id !== item.id ? v - (current.stats[k] || 0) : null;
        const cls = delta == null ? "" : delta > 0 ? " up" : delta < 0 ? " down" : "";
        return `<span class="stat${cls}">${STAT_LABELS[k] || k} ${formatStat(k, v)}</span>`;
      })
      .join("");

    let action = "";
    if (mode === "buy") {
      const afford = this.save.gold >= item.price;
      action = `<button class="btn btn--buy${afford ? "" : " btn--off"}" data-act="buy" data-id="${item.id}">
          ${icon("coin", 14, "#ffcf5f")} ${item.price}</button>`;
    } else if (mode === "sell") {
      action = `<button class="btn btn--sell" data-act="sell" data-id="${entry.uid}">
          Продать ${icon("coin", 13, "#ffcf5f")} ${sellValue(item.id)}</button>`;
    } else if (mode === "equip") {
      action = equipped
        ? `<button class="btn btn--ghost" data-act="unequip" data-slot="${item.slot}">Снять</button>`
        : `<button class="btn btn--primary" data-act="equip" data-id="${entry.uid}">Надеть</button>`;
    }

    return `
      <article class="item-card${equipped ? " is-equipped" : ""}" style="--r:${rarity.color}">
        <div class="item-card__icon">${icon(iconName, 26, rarity.color)}</div>
        <div class="item-card__main">
          <h4 style="color:${rarity.color}">${item.name}${equipped ? " <em>· надето</em>" : ""}</h4>
          <div class="item-stats">${stats}</div>
          <p class="item-desc">${item.desc}</p>
        </div>
        ${action}
      </article>`;
  }

  buyItem(itemId) {
    const item = getItem(itemId);
    if (!item || this.save.gold < item.price) {
      Sfx.play("deny");
      return;
    }
    this.save.gold -= item.price;
    const entry = { uid: `${itemId}-${Date.now().toString(36)}`, itemId };
    this.save.inventory.push(entry);
    Sfx.play("buy");
    Telegram.haptic("success");
    this.game.saveGame();
    this.showShop();
    this.showBanner(item.name, "Куплено");
  }

  buyPotion(id) {
    const potion = POTIONS[id];
    if (!potion || this.save.gold < potion.price) {
      Sfx.play("deny");
      return;
    }
    this.save.gold -= potion.price;
    this.save.potions[id] = (this.save.potions[id] || 0) + 1;
    Sfx.play("buy");
    this.game.saveGame();
    this.showShop();
  }

  sellItem(uid) {
    const idx = this.save.inventory.findIndex((e) => e.uid === uid);
    if (idx < 0) return;
    const entry = this.save.inventory[idx];
    if (Object.values(this.save.equipped).includes(uid)) return;
    this.save.gold += sellValue(entry.itemId);
    this.save.inventory.splice(idx, 1);
    Sfx.play("coin");
    this.game.saveGame();
    this.shopTab === "sell" ? this.showShop() : this.showGear();
  }

  // ── Gear ──────────────────────────────────────────────────────────────────

  showGear() {
    const save = this.save;
    const stats = computeStats(save);

    const slotsHtml = SLOTS.map((slot) => {
      const item = equippedItem(save, slot);
      const rarity = item ? RARITY[item.rarity] : null;
      const iconName = slot === "weapon" ? WEAPON_ICON[item?.kind] || "sword" : SLOT_ICON[slot];
      return `
        <div class="slot${item ? " filled" : ""}" style="--r:${rarity?.color || "#3a3446"}">
          <div class="slot__icon">${icon(iconName, 24, rarity?.color || "#5a5470")}</div>
          <div class="slot__text">
            <span class="slot__name">${SLOT_NAMES[slot]}</span>
            <strong style="color:${rarity?.color || "#6f6a80"}">${item ? item.name : "пусто"}</strong>
          </div>
          ${item ? `<button class="btn btn--tiny" data-act="unequip" data-slot="${slot}">Снять</button>` : ""}
        </div>`;
    }).join("");

    const filters = [["all", "Всё"], ...SLOTS.map((s) => [s, SLOT_NAMES[s]])];
    const items = save.inventory
      .filter((e) => this.gearFilter === "all" || getItem(e.itemId)?.slot === this.gearFilter)
      .sort((a, b) => (getItem(b.itemId)?.price || 0) - (getItem(a.itemId)?.price || 0));

    this.render(
      `
      <div class="screen">
        <header class="screen-head">
          <div>
            <p class="eyebrow">Снаряжение</p>
            <h1>Медвежий доспех</h1>
          </div>
          <div class="purse" data-purse>${this.purseHtml()}</div>
        </header>

        <div class="gear-layout">
          <section class="gear-slots">${slotsHtml}</section>
          <section class="stat-panel">
            <h3>Характеристики</h3>
            <ul>
              <li><span>Здоровье</span><b>${stats.maxHp}</b></li>
              <li><span>Выносливость</span><b>${stats.maxStamina}</b></li>
              <li><span>Урон</span><b>${stats.damage} × ${stats.damageMult.toFixed(2)}</b></li>
              <li><span>Скорость атаки</span><b>×${stats.attackSpeed.toFixed(2)}</b></li>
              <li><span>Броня</span><b>${stats.armor}</b></li>
              <li><span>Крит</span><b>${stats.crit.toFixed(0)}% / ${stats.critDmg}%</b></li>
              <li><span>Вампиризм</span><b>${stats.lifesteal}%</b></li>
              <li><span>Поиск золота / душ</span><b>+${stats.goldFind}% / +${stats.soulFind}%</b></li>
            </ul>
          </section>
        </div>

        <div class="tabs tabs--slim">
          ${filters
            .map(
              ([id, label]) =>
                `<button class="tab${this.gearFilter === id ? " is-active" : ""}" data-act="gearFilter" data-tab="${id}">${label}</button>`
            )
            .join("")}
        </div>

        ${
          items.length
            ? `<div class="item-grid">${items.map((e) => this.itemCard(e, "equip")).join("")}</div>`
            : `<p class="empty">В этой ячейке пока пусто. Загляни в магазин или потряси врагов.</p>`
        }

        <div class="screen-foot"><button class="btn" data-act="${this.backAction()}">Назад</button></div>
      </div>`,
      { wide: true }
    );
  }

  equipItem(uid) {
    const entry = this.save.inventory.find((e) => e.uid === uid);
    if (!entry) return;
    const item = getItem(entry.itemId);
    this.save.equipped[item.slot] = uid;
    Sfx.play("buy");
    this.game.refreshStats();
    this.game.saveGame();
    this.showGear();
  }

  unequipSlot(slot) {
    this.save.equipped[slot] = null;
    Sfx.play("deny");
    this.game.refreshStats();
    this.game.saveGame();
    this.showGear();
  }

  // ── Skill tree ────────────────────────────────────────────────────────────

  showTree() {
    const save = this.save;
    const ranks = save.skills || {};

    const columns = Object.values(BRANCHES)
      .map((branch) => {
        const nodes = SKILLS.filter((s) => s.branch === branch.id);
        const rows = Math.max(...nodes.map((n) => n.row)) + 1;
        const step = 136;
        const height = rows * step + 30;

        const links = nodes
          .flatMap((node) =>
            node.requires.map((req) => {
              const from = SKILL_BY_ID[req.id];
              if (!from) return "";
              const active = (ranks[from.id] || 0) >= req.rank;
              return `<line x1="${from.col * 100 + 50}" y1="${from.row * step + 40}"
                          x2="${node.col * 100 + 50}" y2="${node.row * step + 40}"
                          stroke="${active ? branch.color : "rgba(255,255,255,0.12)"}"
                          stroke-width="${active ? 3 : 2}" stroke-linecap="round" />`;
            })
          )
          .join("");

        const nodesHtml = nodes
          .map((node) => {
            const rank = ranks[node.id] || 0;
            const maxed = rank >= node.maxRank;
            const unlocked = meetsRequirements(node, ranks);
            const cost = rankCost(node, rank);
            const affordable = save.souls >= cost;
            const cls = maxed ? "maxed" : !unlocked ? "locked" : affordable ? "ready" : "poor";
            return `
              <button class="node ${cls}" style="--c:${branch.color};left:${node.col * 100 + 50}px;top:${node.row * step + 40}px"
                      data-act="learn" data-id="${node.id}" ${maxed || !unlocked ? "disabled" : ""}>
                <span class="node__icon">${icon(node.icon, 22, maxed || affordable ? branch.color : "#6d6880")}</span>
                <span class="node__rank">${rank}/${node.maxRank}</span>
              </button>
              <div class="node-tip" style="left:${node.col * 100 + 50}px;top:${node.row * step + 74}px">
                <strong>${node.name}</strong>
                <span>${node.desc(Math.min(rank + 1, node.maxRank))}</span>
                ${maxed ? '<em class="done">Изучено</em>' : `<em>${icon("soul", 11, "#7fd6ff")} ${cost}</em>`}
              </div>`;
          })
          .join("");

        return `
          <section class="branch" style="--c:${branch.color}">
            <header>
              <h3>${branch.name}</h3>
              <p>${branch.desc}</p>
            </header>
            <div class="branch-canvas" style="height:${height}px">
              <svg viewBox="0 0 300 ${height}" preserveAspectRatio="none">${links}</svg>
              ${nodesHtml}
            </div>
          </section>`;
      })
      .join("");

    this.render(
      `
      <div class="screen screen--tree">
        <header class="screen-head">
          <div>
            <p class="eyebrow">Дерево умений</p>
            <h1>Три пути зверя</h1>
          </div>
          <div class="purse" data-purse>${this.purseHtml()}</div>
        </header>
        <p class="hint">Души тратятся на ранги. Нажми на узел, чтобы изучить.</p>
        <div class="tree">${columns}</div>
        <div class="screen-foot"><button class="btn" data-act="${this.backAction()}">Назад</button></div>
      </div>`,
      { wide: true }
    );
  }

  learnSkill(id) {
    const skill = SKILL_BY_ID[id];
    if (!skill) return;
    const ranks = this.save.skills;
    const rank = ranks[id] || 0;
    if (rank >= skill.maxRank || !meetsRequirements(skill, ranks)) return;
    const cost = rankCost(skill, rank);
    if (this.save.souls < cost) {
      Sfx.play("deny");
      this.showBanner("Не хватает душ", `Нужно ${cost}`);
      return;
    }
    this.save.souls -= cost;
    ranks[id] = rank + 1;
    Sfx.play("levelup");
    Telegram.haptic("success");
    this.game.refreshStats();
    this.game.saveGame();
    this.showTree();
    this.showBanner(skill.name, `Ранг ${rank + 1}`);
  }

  // ── Pause / death / victory / settings ────────────────────────────────────

  showPause() {
    this.render(`
      <div class="screen screen--modal">
        <h1>Пауза</h1>
        <p class="hint">${this.game.level.name}</p>
        <div class="modal-actions">
          <button class="btn btn--primary" data-act="resume">Продолжить</button>
          <button class="btn" data-act="gear">Снаряжение</button>
          <button class="btn" data-act="tree">Умения</button>
          <button class="btn" data-act="shop">Магазин</button>
          <button class="btn btn--ghost" data-act="settings">Настройки</button>
          <button class="btn btn--danger" data-act="hub">Выйти в лагерь</button>
        </div>
      </div>`);
  }

  showDeath({ lostGold, canRespawn, run }) {
    this.render(`
      <div class="screen screen--modal screen--death">
        <p class="eyebrow">Тьма забрала тебя</p>
        <h1>Ты пал</h1>
        <p class="hint">Потеряно ${lostGold} золота. Души остались при тебе.</p>
        <div class="run-summary">
          <span>Убито: ${run?.kills || 0}</span>
          <span>Золота: ${run?.gold || 0}</span>
          <span>Душ: ${run?.souls || 0}</span>
          <span>Трофеев: ${run?.items.length || 0}</span>
        </div>
        <div class="modal-actions">
          ${canRespawn ? '<button class="btn btn--primary" data-act="respawn">Возродиться у костра</button>' : ""}
          <button class="btn" data-act="retry">Начать уровень заново</button>
          <button class="btn btn--ghost" data-act="hub">В лагерь</button>
        </div>
      </div>`);
  }

  showLevelComplete({ level, firstClear, bonusGold, bonusSouls, run, lastLevel }) {
    const loot = run.items
      .map((id) => {
        const item = getItem(id);
        return `<span style="color:${RARITY[item.rarity].color}">${item.name}</span>`;
      })
      .join(", ");

    this.render(`
      <div class="screen screen--modal screen--victory">
        <p class="eyebrow">${firstClear ? "Земля очищена впервые" : "Уровень пройден"}</p>
        <h1>${level.name}</h1>
        <div class="run-summary">
          <span>Убито: ${run.kills}</span>
          <span>Золота: ${run.gold} <b>+${bonusGold}</b></span>
          <span>Душ: ${run.souls} <b>+${bonusSouls}</b></span>
        </div>
        ${loot ? `<p class="loot-line">Трофеи: ${loot}</p>` : ""}
        ${lastLevel && firstClear ? '<p class="hint">Медвежий Король пал. Север свободен — но тьма всегда возвращается.</p>' : ""}
        <div class="modal-actions">
          ${!lastLevel ? '<button class="btn btn--primary" data-act="nextLevel">Следующая земля</button>' : ""}
          <button class="btn" data-act="tree">Потратить души</button>
          <button class="btn btn--ghost" data-act="hub">В лагерь</button>
        </div>
      </div>`);
  }

  showSettings() {
    this.render(`
      <div class="screen screen--modal">
        <h1>Настройки</h1>
        <div class="modal-actions">
          <button class="btn" data-act="mute">Звук: ${Sfx.muted ? "выключен" : "включён"}</button>
          <button class="btn btn--ghost" data-act="${this.backAction()}">Назад</button>
          <button class="btn btn--danger" data-act="wipe">Стереть сохранение</button>
        </div>
        <p class="hint">Прогресс хранится в ${SaveStore.backend}. В Telegram он привязан к аккаунту и переносится между устройствами.</p>
        <p class="hint hint--keys">
          Движение: A/D или ←/→ · Прыжок: W/Space · Вниз: S ·
          Атака: J · Тяжёлый удар: K · Рывок: Shift · Рёв: Q · Сгусток: E · Зелье: R · Действие: F · Пауза: Esc
        </p>
      </div>`);
  }

  async wipeSave() {
    if (!window.confirm("Стереть весь прогресс без возможности вернуть?")) return;
    await SaveStore.wipe();
    const fresh = createDefaultSave();
    Object.keys(this.game.save).forEach((k) => delete this.game.save[k]);
    Object.assign(this.game.save, fresh);
    this.game.refreshStats();
    this.game.returnToHub("Сохранение стёрто. Новый путь начинается здесь.");
  }
}
