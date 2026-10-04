import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cellCount,
  emptyBoard,
  linesAlong,
  move,
  toCoords,
  toIndex,
} from "../src/game.js";

// A 1D board of side s is one line, which makes the classic rules easy to state.
const slideRight = (values) => move(values, values.length, 0, 1, 1);
const slideLeft = (values) => move(values, values.length, 0, -1, 1);

test("coordinates and indices round-trip", () => {
  for (const side of [2, 3]) {
    for (let i = 0; i < cellCount(side); i++) assert.equal(toIndex(toCoords(i, side), side), i);
  }
});

test("each axis has s^(n-1) lines of length s", () => {
  for (const side of [2, 3]) {
    for (let axis = 0; axis < 4; axis++) {
      const lines = linesAlong(axis, side);
      assert.equal(lines.length, side ** 3);
      for (const l of lines) assert.equal(l.length, side);
    }
  }
});

test("classic merge rules hold along a line", () => {
  assert.deepEqual(slideLeft([2, 2, 2, 2]).cells, [4, 4, 0, 0]);
  assert.deepEqual(slideLeft([2, 2, 4, 0]).cells, [4, 4, 0, 0]); // a merged tile does not merge again
  assert.deepEqual(slideLeft([4, 0, 4, 0]).cells, [8, 0, 0, 0]);
  assert.deepEqual(slideRight([2, 2, 2, 0]).cells, [0, 0, 2, 4]); // the front pair merges first
  assert.deepEqual(slideLeft([2, 4, 8, 16]).moved, false);
});

test("points gained equal the sum of merged values", () => {
  assert.equal(slideLeft([2, 2, 4, 4]).gained, 4 + 8);
});

test("moves report where every tile went", () => {
  const { moves, merges } = slideLeft([0, 2, 0, 2]);
  assert.deepEqual(
    moves.map((m) => [m.from, m.to]).sort(),
    [
      [1, 0],
      [3, 0],
    ]
  );
  assert.deepEqual(merges, [{ at: 0, value: 4 }]);
});

test("a move along w only changes the w coordinate", () => {
  const side = 2;
  const cells = emptyBoard(side);
  cells[toIndex([1, 0, 1, 0], side)] = 2;
  const { cells: next, moves } = move(cells, side, 3, 1);
  assert.equal(next[toIndex([1, 0, 1, 1], side)], 2);
  assert.deepEqual(toCoords(moves[0].to, side), [1, 0, 1, 1]);
});

test("tiles on different lines of the tesseract never merge", () => {
  const side = 2;
  const cells = emptyBoard(side);
  cells[toIndex([0, 0, 0, 0], side)] = 2;
  cells[toIndex([1, 1, 0, 0], side)] = 2; // diagonal neighbor, not on an x line with the first
  const { cells: next } = move(cells, side, 0, 1);
  assert.equal(next.filter(Boolean).length, 2);
});
