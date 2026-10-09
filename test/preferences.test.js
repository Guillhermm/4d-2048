import { test } from "node:test";
import assert from "node:assert/strict";

import { loadPreferences, savePreferences, STORAGE_KEY } from "../src/preferences.js";

const memoryStorage = (initial) => {
  const data = new Map(initial ? [[STORAGE_KEY, initial]] : []);
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    raw: () => data.get(STORAGE_KEY),
  };
};

const LANGS = ["en", "pt-BR"];

test("saved preferences round-trip", () => {
  const storage = memoryStorage();
  savePreferences(storage, { theme: "dark", language: "pt-BR", best: { 2: 512 } });
  assert.deepEqual(loadPreferences(storage, LANGS), { theme: "dark", language: "pt-BR", best: { 2: 512 } });
});

test("system is a valid theme", () => {
  const storage = memoryStorage(JSON.stringify({ theme: "system" }));
  assert.equal(loadPreferences(storage, LANGS).theme, "system");
});

test("missing or broken storage gives defaults", () => {
  assert.deepEqual(loadPreferences(null, LANGS), { best: {} });
  assert.deepEqual(loadPreferences(memoryStorage("{not json"), LANGS), { best: {} });
  assert.deepEqual(loadPreferences(memoryStorage("null"), LANGS), { best: {} });
});

test("unknown values are dropped", () => {
  const storage = memoryStorage(JSON.stringify({ theme: "neon", language: "<script>", best: { 2: "abc", 3: 500, 9: 100 } }));
  assert.deepEqual(loadPreferences(storage, LANGS), { best: {} });
});

test("saving survives a storage that throws", () => {
  const throwing = { setItem() { throw new Error("QuotaExceededError"); } };
  assert.doesNotThrow(() => savePreferences(throwing, { theme: "light" }));
});
