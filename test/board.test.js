import { test } from "node:test";
import assert from "node:assert/strict";

import { norm } from "../src/linalg.js";
import { cellCount } from "../src/game.js";
import { cellPosition, gridEdges } from "../src/board.js";

test("the side-2 board is the tesseract with circumradius 1", () => {
  for (let i = 0; i < cellCount(2); i++) assert.ok(Math.abs(norm(cellPosition(i, 2)) - 1) < 1e-12);
  assert.equal(gridEdges(2).length, 32);
});

test("a side-s board has 4 * s^3 * (s - 1) grid edges", () => {
  assert.equal(gridEdges(3).length, 4 * 27 * 2);
});
