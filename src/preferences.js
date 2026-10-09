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
  return prefs;
};

export const savePreferences = (storage, prefs) => {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private windows and full storage both throw here; the game works without saving.
  }
};
