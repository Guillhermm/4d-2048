import { LOCALES } from "./locales/index.js";

export const DEFAULT_LANGUAGE = "en";

export const languages = () => Object.keys(LOCALES);

export const languageName = (code) => LOCALES[code]?.name ?? code;

// Falls back to English for a key a locale lacks; a key missing from English is a bug.
export const translate = (language, key, params = {}) => {
  const value = LOCALES[language]?.messages[key] ?? LOCALES[DEFAULT_LANGUAGE].messages[key];
  if (value === undefined) throw new Error(`Missing translation key: ${key}`);
  if (typeof value === "function") return value(params);
  if (typeof value !== "string") return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
};
