import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { THEME_LABELS, THEME_OPTIONS } from "../src/settings.js";
import { languages, translate } from "../src/i18n.js";

test("every appearance option has a label in every language", () => {
  for (const code of languages()) {
    for (const value of THEME_OPTIONS) {
      const label = translate(code, THEME_LABELS[value]);
      assert.equal(typeof label, "string");
      assert.ok(label.length > 0, `${code} ${value}`);
    }
  }
});

test("every link that opens a new tab is https, isolated and labeled in every language", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const links = [...html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].map(([tag]) => tag);
  assert.equal(links.length, 3);
  for (const tag of links) {
    assert.match(tag, /href="https:\/\//);
    assert.match(tag, /rel="noopener noreferrer"/);
    const key = tag.match(/data-i18n-aria="([^"]+)"/)?.[1];
    assert.ok(key, tag);
    for (const code of languages()) assert.notEqual(translate(code, key), key, `${code} ${key}`);
  }
});
