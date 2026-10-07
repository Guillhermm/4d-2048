import { test } from "node:test";
import assert from "node:assert/strict";

import { fitScale } from "../src/layout.js";

const boardBox = ({ k, cx, cy }, rx, ry) => ({ x: cx - rx * k, y: cy - ry * k, w: 2 * rx * k, h: 2 * ry * k });
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test("without obstacles the board is centered and fills the view up to the margin", () => {
  assert.deepEqual(fitScale({ width: 400, height: 400, rx: 1, ry: 1 }), { k: 176, cx: 200, cy: 200 });
});

test("obstacles the board does not reach leave it alone", () => {
  const obstacles = [{ x: 1000, y: 12, w: 100, h: 44 }];
  assert.deepEqual(fitScale({ width: 1100, height: 780, rx: 1, ry: 1, obstacles }), { k: 366, cx: 550, cy: 390 });
});

test("corner controls on a phone-sized view are always cleared", () => {
  const width = 368;
  const height = 490;
  const obstacles = [
    { x: 256, y: 12, w: 100, h: 44 },
    { x: 312, y: 434, w: 44, h: 44 },
    { x: 4, y: 382, w: 108, h: 108 },
  ];
  for (const [rx, ry] of [[1, 1], [1.2, 0.8], [0.7, 1.1]]) {
    const fit = fitScale({ width, height, rx, ry, obstacles });
    const box = boardBox(fit, rx, ry);
    for (const o of obstacles) assert.ok(!overlaps(box, o), `board ${JSON.stringify(box)} hits ${JSON.stringify(o)}`);
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= width && box.y + box.h <= height);
  }
});

test("a tall bottom band does not cost the same space at the top", () => {
  const obstacles = [
    { x: 300, y: 12, w: 50, h: 44 },
    { x: 0, y: 380, w: 110, h: 110 },
  ];
  const fit = fitScale({ width: 368, height: 490, rx: 1, ry: 1, obstacles });
  assert.equal(fit.cy, 64 + (490 - 64 - 118) / 2);
  assert.equal(fit.k, (490 - 64 - 118) / 2);
});

test("it gives up the side bands when that keeps the board bigger", () => {
  const obstacles = [{ x: 0, y: 0, w: 300, h: 300 }];
  const fit = fitScale({ width: 800, height: 300, rx: 1, ry: 1, obstacles });
  assert.equal(fit.k, 126);
  assert.equal(fit.cy, 150);
  assert.equal(fit.cx, 308 + (800 - 308 - 24) / 2);
});
