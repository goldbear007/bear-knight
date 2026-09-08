const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
// The SDK script also loads in a normal browser, where `platform` stays "unknown".
const inTelegram = Boolean(webApp && webApp.platform && webApp.platform !== "unknown");
const tg = inTelegram ? webApp : null;

export const Telegram = {
  available: inTelegram,
  raw: tg,

  init() {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.("#0b0710");
      tg.setBackgroundColor?.("#0b0710");
      tg.disableVerticalSwipes?.();
      document.body.classList.add("in-telegram");
    } catch {
      /* older Telegram clients simply lack some of these methods */
    }
  },

  get playerName() {
    const user = tg?.initDataUnsafe?.user;
    if (!user) return "Странник";
    return user.first_name || user.username || "Странник";
  },

  /** Player-scoped key so two Telegram accounts on one device keep separate saves. */
  get userKey() {
    const id = tg?.initDataUnsafe?.user?.id;
    return id ? `tg${id}` : "local";
  },

  haptic(style = "light") {
    try {
      if (style === "success" || style === "error" || style === "warning") {
        tg?.HapticFeedback?.notificationOccurred(style);
      } else {
        tg?.HapticFeedback?.impactOccurred(style);
      }
    } catch {
      /* haptics are optional */
    }
  },
};
