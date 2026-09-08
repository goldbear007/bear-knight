const KEY_MAP = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyW: "jump",
  ArrowUp: "jump",
  Space: "jump",
  KeyS: "down",
  ArrowDown: "down",
  KeyJ: "attack",
  KeyX: "attack",
  KeyK: "heavy",
  KeyC: "heavy",
  ShiftLeft: "dash",
  ShiftRight: "dash",
  KeyL: "dash",
  KeyQ: "roar",
  KeyE: "bolt",
  KeyR: "potion",
  KeyF: "interact",
  Enter: "interact",
  Escape: "menu",
  Tab: "menu",
};

const NO_SCROLL = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"]);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressedThisFrame = new Set();
    this.releasedThisFrame = new Set();
    this.enabled = true;

    window.addEventListener("keydown", (e) => {
      if (NO_SCROLL.has(e.code)) e.preventDefault();
      const action = KEY_MAP[e.code];
      if (!action || e.repeat) return;
      this.press(action);
    });

    window.addEventListener("keyup", (e) => {
      const action = KEY_MAP[e.code];
      if (action) this.release(action);
    });

    window.addEventListener("blur", () => {
      for (const a of [...this.down]) this.release(a);
    });

    this.bindTouchControls();
  }

  bindTouchControls() {
    const buttons = document.querySelectorAll("[data-action]");
    for (const el of buttons) {
      const action = el.dataset.action;
      const start = (e) => {
        e.preventDefault();
        el.classList.add("is-held");
        this.press(action);
      };
      const end = (e) => {
        e.preventDefault();
        el.classList.remove("is-held");
        this.release(action);
      };
      el.addEventListener("pointerdown", start);
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("pointerleave", end);
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }

  press(action) {
    if (!this.enabled) return;
    if (!this.down.has(action)) this.pressedThisFrame.add(action);
    this.down.add(action);
  }

  release(action) {
    if (this.down.delete(action)) this.releasedThisFrame.add(action);
  }

  isDown(action) {
    return this.enabled && this.down.has(action);
  }

  justPressed(action) {
    return this.enabled && this.pressedThisFrame.has(action);
  }

  justReleased(action) {
    return this.releasedThisFrame.has(action);
  }

  /** Drop every held key, e.g. when a menu opens so the knight does not keep running. */
  clear() {
    this.down.clear();
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}
