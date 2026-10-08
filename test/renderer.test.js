import { test } from "node:test";
import assert from "node:assert/strict";

import { tileLabel } from "../src/renderer.js";

test("tiles up to 8192 show the full number", () => {
  for (const v of [2, 64, 1024, 2048, 8192]) assert.equal(tileLabel(v), String(v));
});

test("larger tiles are shown in binary thousands", () => {
  assert.equal(tileLabel(16384), "16k");
  assert.equal(tileLabel(65536), "64k");
  assert.equal(tileLabel(131072), "128k");
});
