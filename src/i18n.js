import { LOCALES } from "./locales/index.js";

export const DEFAULT_LANGUAGE = "en";

export const languages = () => Object.keys(LOCALES);

export const languageName = (code) => LOCALES[code]?.name ?? code;

const lookup = (language, key) => LOCALES[language]?.messages[key] ?? LOCALES[DEFAULT_LANGUAGE].messages[key];

const format = (value, params) => {
  if (typeof value === "function") return value(params);
  if (typeof value !== "string") return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
};

// Falls back to English for a key a locale lacks; a key missing from English is a bug.
export const translate = (language, key, params = {}) => {
  const value = lookup(language, key);
  if (value === undefined) throw new Error(`Missing translation key: ${key}`);
  return format(value, params);
};

// For the page: right after a deploy, Pages' ten-minute cache can pair a new index.html with old
// locales, and a missing key must not stop the game from starting.
export const translateOr = (language, key, fallback, params = {}) => {
  const value = lookup(language, key);
  return value === undefined ? fallback : format(value, params);
};
