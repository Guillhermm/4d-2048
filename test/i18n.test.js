import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LOCALES } from "../src/locales/index.js";
import { languageName, languages, translate, translateOr } from "../src/i18n.js";

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const english = LOCALES.en.messages;

test("English is the default and listed first", () => {
  assert.equal(languages()[0], "en");
  assert.equal(languageName("en"), "English");
});

for (const code of languages()) {
  const { messages } = LOCALES[code];

  test(`${code} has exactly the English keys`, () => {
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(english).sort());
  });

  test(`${code} keeps the English placeholders and value types`, () => {
    for (const [key, value] of Object.entries(english)) {
      assert.equal(typeof messages[key], typeof value, key);
      if (typeof value === "string") assert.deepEqual(placeholders(messages[key]), placeholders(value), key);
    }
  });

  test(`${code} counts moves and labels every key`, () => {
    for (const count of [0, 1, 2, 17]) {
      const text = translate(code, "moves", { count });
      assert.ok(text.includes(String(count)), text);
    }
    assert.deepEqual(Object.keys(translate(code, "keys")).sort(), ["wMinus", "wPlus", "zMinus", "zPlus"]);
  });
}

test("placeholders are filled and unknown ones are left alone", () => {
  assert.equal(translate("en", "overText", { score: 42 }), "No axis has equal neighbors. Score: 42.");
  assert.equal(translate("en", "overText"), "No axis has equal neighbors. Score: {score}.");
});

test("an unknown language falls back to English; an unknown key throws", () => {
  assert.equal(translate("xx", "newGame"), "New game");
  assert.throws(() => translate("en", "noSuchKey"), /Missing translation key/);
});

test("a key no locale has falls back instead of throwing", () => {
  assert.equal(translateOr("en", "noSuchKey", "kept"), "kept");
  assert.equal(translateOr("pt-BR", "overText", "x", { score: 7 }), translate("pt-BR", "overText", { score: 7 }));
});

// translateOr hides a missing key from players, so a typo has to be caught here instead.
test("every key the page asks for exists in English", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const html = read("index.html");
  const main = read("src/main.js");
  const keys = [
    ...[...html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)].map(([, key]) => key),
    ...[...main.matchAll(/\bt\("([^"]+)"/g)].map(([, key]) => key),
  ];
  assert.ok(keys.length > 20);
  for (const key of keys) assert.ok(key in english, key);
});
