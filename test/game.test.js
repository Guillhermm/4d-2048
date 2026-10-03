import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cellCount,
  toCoords,
  toIndex,
} from "../src/game.js";

test("coordinates and indices round-trip", () => {
  for (const side of [2, 3]) {
    for (let i = 0; i < cellCount(side); i++) assert.equal(toIndex(toCoords(i, side), side), i);
  }
});
