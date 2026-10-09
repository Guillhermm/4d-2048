import { test } from "node:test";
import assert from "node:assert/strict";

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
