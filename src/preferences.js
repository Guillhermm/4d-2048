import { canMove, cellCount } from "./game.js";

// theme-boot.js reads the same key before the page paints; keep the two in sync.
export const STORAGE_KEY = "4d-2048";

const THEMES = ["system", "light", "dark"];

export const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// The only board that ships; a saved game for another side is dropped.
const GAME_SIDE = 2;
// A 2⁴ board cannot hold more than 2^17, so anything larger is corrupt.
const MAX_TILE = 2 ** 17;

const isCount = (n) => Number.isSafeInteger(n) && n >= 0;
const isTile = (n) => n === 0 || (Number.isInteger(n) && n >= 2 && n <= MAX_TILE && (n & (n - 1)) === 0);

// All or nothing: one inconsistent field drops the whole saved game. `over` is recomputed from
// the board rather than trusted.
export const validateGame = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (raw.side !== GAME_SIDE) return null;
  const { cells, score, moves, won } = raw;
  if (!Array.isArray(cells) || cells.length !== cellCount(GAME_SIDE) || !cells.every(isTile)) return null;
  if (!cells.some((v) => v)) return null;
  if (!isCount(score) || !isCount(moves) || typeof won !== "boolean" || typeof raw.over !== "boolean") return null;
  return { side: GAME_SIDE, cells: [...cells], score, moves, won, over: !canMove(cells, GAME_SIDE) };
};

// Anything stored is untrusted: unknown values are dropped rather than applied.
export const loadPreferences = (storage, languages) => {
  let raw = {};
  try {
    raw = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    raw = {};
  }
  const prefs = { best: {} };
  if (THEMES.includes(raw.theme)) prefs.theme = raw.theme;
  if (typeof raw.language === "string" && languages.includes(raw.language)) prefs.language = raw.language;
  if (raw.best && typeof raw.best === "object") {
    const value = Number(raw.best["2"]);
    if (Number.isFinite(value) && value > 0) prefs.best["2"] = Math.floor(value);
  }
  const game = validateGame(raw.game);
  if (game) prefs.game = game;
  return prefs;
};

export const savePreferences = (storage, prefs) => {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private windows and full storage both throw here; the game works without saving.
  }
};
