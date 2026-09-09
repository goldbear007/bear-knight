import { Input } from "./core/input.js";
import { Sfx } from "./core/audio.js";
import { Telegram } from "./core/telegram.js";
import { SaveStore } from "./core/save.js";
import { Game } from "./game/game.js";
import { UI } from "./ui/ui.js";
import { loadArt } from "./game/art.js";

async function boot() {
  Telegram.init();

  const save = await SaveStore.load();
  Sfx.setMuted(Boolean(save.settings?.muted));

  const canvas = document.getElementById("game");
  const overlay = document.getElementById("overlay");
  const banner = document.getElementById("banner");

  const enableTouchUi = () => document.body.classList.add("has-touch");
  if (
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window ||
    window.matchMedia?.("(pointer: coarse)")?.matches
  ) {
    enableTouchUi();
  }
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch") enableTouchUi();
    },
    { passive: true }
  );

  await loadArt();

  const input = new Input();
  const ui = new UI(overlay, banner);
  const game = new Game(canvas, save, input, ui);
  ui.setGame(game);

  window.bearKnight = { game, ui, save };

  input.enabled = false;
  game.prepareHubScene();
  game.start();
  ui.showHub();

  document.getElementById("pause-btn").addEventListener("click", () => {
    if (game.state === "playing") game.pause();
    else if (game.state === "paused") game.resume();
  });

  // Browsers only allow audio after a gesture.
  const unlock = () => {
    Sfx.ensure();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);

  window.addEventListener("beforeunload", () => SaveStore.save(save));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) SaveStore.save(save);
  });

  document.getElementById("boot")?.remove();
}

boot().catch((err) => {
  console.error(err);
  const boot = document.getElementById("boot");
  if (boot) boot.innerHTML = `<p style="color:#ff8a8a">Не удалось запустить игру: ${err.message}</p>`;
});
