const PATHS = {
  sword: "M12 2 14 4 8 16 6 14z M5 15l4 4 -2 2 -4-4z",
  dagger: "M12 3l2 2-5 9-2-2z M6 13l3 3-2 2-3-3z",
  axe: "M13 3c3 0 5 2 5 5l-4 1-1-3zM12 5 6 17l2 1 6-11z",
  hammer: "M6 4h9v5H6z M10 9h2v9h-2z",
  helm: "M12 3a7 7 0 0 1 7 7v6h-4v-4l-3 3-3-3v4H5v-6a7 7 0 0 1 7-7z",
  chest: "M6 6h12v4l-2 8H8L6 10z M11 6h2v12h-2z",
  legs: "M7 5h10l-1 14h-3l-1-8-1 8H8z",
  cloak: "M12 4l6 3-2 13H8L6 7z",
  potion: "M10 3h4v3l3 8a4 4 0 0 1-4 6h-2a4 4 0 0 1-4-6l3-8z",
  heart: "M12 20S4 14 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 11-8 11z",
  shield: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
  bolt: "M13 2 5 13h5l-1 9 8-11h-5z",
  roar: "M12 5a7 7 0 0 1 7 7 7 7 0 0 1-7 7 7 7 0 0 1-7-7 7 7 0 0 1 7-7zM8 11h8M9 15h6",
  rage: "M6 18 12 4l6 14-6-3z",
  crown: "M4 17 6 7l4 4 2-6 2 6 4-4 2 10z",
  boot: "M8 4h4v8h5l2 6H8z",
  dash: "M3 12h9M6 8h9M6 16h9M15 6l5 6-5 6z",
  eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  wing: "M3 14c6-8 12-9 18-10-2 8-8 12-14 12z",
  slash: "M4 20 20 4l-2 8-8 8z",
  wind: "M3 8h11a3 3 0 1 0-3-3M3 13h14a3 3 0 1 1-3 3M3 18h8",
  drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  orb: "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  coin: "M12 3a9 5 0 1 1 0 10 9 5 0 0 1 0-10zM3 11v3a9 5 0 0 0 18 0v-3a9 5 0 0 1-18 0z",
  ward: "M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7zM9 12l2 2 4-4",
  soul: "M12 3c4 4 5 7 5 10a5 5 0 0 1-10 0c0-3 1-6 5-10z",
  nova: "M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4",
  eclipse: "M12 3a9 9 0 1 0 0 18 9 9 0 0 1 0-18z",
  gold: "M12 3a9 5 0 1 1 0 10 9 5 0 0 1 0-10z",
  skull: "M12 3a8 8 0 0 1 8 8v4l-3 2v3h-4v-3h-2v3H7v-3l-3-2v-4a8 8 0 0 1 8-8z",
};

export function icon(name, size = 22, color = "currentColor") {
  const d = PATHS[name] || PATHS.orb;
  const stroked = ["roar", "nova", "wind", "dash", "ward"].includes(name);
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
    <path d="${d}" ${stroked ? `fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"` : `fill="${color}"`} />
  </svg>`;
}

export const SLOT_ICON = {
  weapon: "sword",
  helm: "helm",
  chest: "chest",
  legs: "legs",
  cloak: "cloak",
};

export const WEAPON_ICON = {
  sword: "sword",
  dagger: "dagger",
  axe: "axe",
  hammer: "hammer",
};
