import { test } from "node:test";
import assert from "node:assert/strict";

import { applyMatrix, dot, identity, norm, reorthonormalize, rotate } from "../src/linalg.js";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("rotate keeps R orthonormal and only touches its plane", () => {
  const R = identity(4);
  rotate(R, 1, 3, 0.7);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) assert.ok(close(dot(R[i], R[j]), i === j ? 1 : 0));
  }
  const v = applyMatrix(R, [1, 0, 1, 0]);
  assert.deepEqual([v[0], v[2]], [1, 1]);
  assert.ok(close(v[1], 0) && close(v[3], 0));
  const e1 = applyMatrix(R, [0, 1, 0, 0]);
  assert.ok(close(e1[1], Math.cos(0.7)) && close(e1[3], Math.sin(0.7)));
});

test("reorthonormalize repairs drift", () => {
  const R = identity(4);
  for (let k = 0; k < 5000; k++) {
    rotate(R, 0, 3, 0.013);
    rotate(R, 1, 2, 0.007);
  }
  R[0][0] *= 1.001;
  reorthonormalize(R);
  for (let i = 0; i < 4; i++) assert.ok(close(norm(R[i]), 1, 1e-12));
  assert.ok(close(dot(R[0], R[3]), 0, 1e-12));
});
