import { test } from "node:test";
import assert from "node:assert/strict";

import { LOCALES } from "../src/locales/index.js";
import { languageName, languages, translate } from "../src/i18n.js";

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
