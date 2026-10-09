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

const GAME = { side: 2, cells: [2, 4, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2048], score: 120, moves: 14, won: true, over: false };
const withGame = (game) => memoryStorage(JSON.stringify({ game }));
const loadGame = (game) => loadPreferences(withGame(game), LANGS).game;

test("a saved game round-trips next to the preferences", () => {
  const storage = memoryStorage();
  savePreferences(storage, { theme: "dark", best: { 2: 9 }, game: GAME });
  const loaded = loadPreferences(storage, LANGS);
  assert.deepEqual(loaded.game, GAME);
  assert.equal(loaded.theme, "dark");
  assert.equal(JSON.parse(storage.raw()).theme, "dark");
});

test("a saved game is rejected on any inconsistency", () => {
  const bad = [
    { ...GAME, side: 3 },
    { ...GAME, side: "2" },
    { ...GAME, cells: GAME.cells.slice(1) },
    { ...GAME, cells: [...GAME.cells, 2] },
    { ...GAME, cells: "2,4" },
    { ...GAME, cells: GAME.cells.map((v, i) => (i === 0 ? 3 : v)) },
    { ...GAME, cells: GAME.cells.map((v, i) => (i === 0 ? 1 : v)) },
    { ...GAME, cells: GAME.cells.map((v, i) => (i === 0 ? -2 : v)) },
    { ...GAME, cells: GAME.cells.map((v, i) => (i === 0 ? 2.5 : v)) },
    { ...GAME, cells: GAME.cells.map((v, i) => (i === 0 ? 2 ** 18 : v)) },
    { ...GAME, cells: GAME.cells.map((v, i) => (i === 0 ? "2" : v)) },
    { ...GAME, cells: GAME.cells.map((v, i) => (i === 0 ? null : v)) },
    { ...GAME, cells: new Array(16).fill(0) },
    { ...GAME, score: -1 },
    { ...GAME, score: 1.5 },
    { ...GAME, score: "10" },
    { ...GAME, score: Number.MAX_SAFE_INTEGER + 2 },
    { ...GAME, moves: -3 },
    { ...GAME, moves: 0.5 },
    { ...GAME, moves: null },
    { ...GAME, won: 1 },
    { ...GAME, over: "false" },
    { ...GAME, won: undefined },
  ];
  for (const game of bad) assert.equal(loadGame(game), undefined, JSON.stringify(game));
});

test("hostile saved games are dropped without throwing", () => {
  for (const game of [null, 7, "x", [], [GAME], true, {}, { side: 2 }]) {
    assert.equal(loadGame(game), undefined, JSON.stringify(game));
  }
  const proto = memoryStorage('{"game":{"__proto__":{"side":2},"cells":[]}}');
  assert.equal(loadPreferences(proto, LANGS).game, undefined);
  assert.deepEqual(loadPreferences(memoryStorage('{"game":{"side":2,"cells":{"length":16}}}'), LANGS), { best: {} });
});

test("a corrupt game does not discard valid preferences", () => {
  const storage = memoryStorage(JSON.stringify({ theme: "light", game: { ...GAME, score: -1 } }));
  assert.deepEqual(loadPreferences(storage, LANGS), { theme: "light", best: {} });
});

test("over is recomputed from the board, not trusted", () => {
  const full = [2, 4, 4, 2, 4, 2, 2, 4, 4, 2, 2, 4, 2, 4, 4, 2];
  // 2 on even-parity vertices and 4 on odd ones: every edge joins different values.
  assert.equal(loadGame({ ...GAME, cells: full, over: false }).over, true);
  assert.equal(loadGame({ ...GAME, over: true }).over, false);
});

test("a finished game restores as over, with the saved score and win flag", () => {
  const dead = [2, 4, 4, 2, 4, 2, 2, 4, 4, 2, 2, 4, 2, 4, 4, 2];
  const game = loadGame({ ...GAME, cells: dead, over: true, won: false, score: 300, moves: 90 });
  assert.deepEqual(game, { side: 2, cells: dead, score: 300, moves: 90, won: false, over: true });
});
