import { test } from "node:test";
import assert from "node:assert/strict";

import { norm } from "../src/linalg.js";
import { cellCount } from "../src/game.js";
import { cellPosition, compassView, gridEdges, screenAxes } from "../src/board.js";

test("the side-2 board is the tesseract with circumradius 1", () => {
  for (let i = 0; i < cellCount(2); i++) assert.ok(Math.abs(norm(cellPosition(i, 2)) - 1) < 1e-12);
  assert.equal(gridEdges(2).length, 32);
});

test("a side-s board has 4 * s^3 * (s - 1) grid edges", () => {
  assert.equal(gridEdges(3).length, 4 * 27 * 2);
});

test("the compass view is orthonormal and spaces the eight directions 45° apart", () => {
  const R = compassView();
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const d = R[i].reduce((s, x, k) => s + x * R[j][k], 0);
      assert.ok(Math.abs(d - (i === j ? 1 : 0)) < 1e-12);
    }
  }
  const angles = screenAxes(R)
    .flatMap(([x, y]) => [Math.atan2(y, x), Math.atan2(-y, -x)])
    .map((a) => ((a * 180) / Math.PI + 360) % 360)
    .sort((a, b) => a - b);
  angles.forEach((a, i) => assert.ok(Math.abs(a - i * 45) < 1e-9, `direction ${i} at ${a}°`));
});

test("in the compass view the 16 cells land on distinct screen points", () => {
  const R = compassView();
  const seen = new Set();
  for (let i = 0; i < cellCount(2); i++) {
    const p = cellPosition(i, 2);
    const x = R[0].reduce((s, r, k) => s + r * p[k], 0);
    const y = R[1].reduce((s, r, k) => s + r * p[k], 0);
    seen.add(`${x.toFixed(6)},${y.toFixed(6)}`);
  }
  assert.equal(seen.size, 16);
});
