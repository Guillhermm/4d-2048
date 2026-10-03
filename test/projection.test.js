import { test } from "node:test";
import assert from "node:assert/strict";

import { CAMERA_DISTANCE, perspectiveScale, projectTo2D } from "../src/projection.js";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("orthographic projection drops the trailing coordinates", () => {
  assert.deepEqual(projectTo2D([0.1, 0.2, 0.3, 0.4], false), [0.1, 0.2]);
});

test("perspective is the identity at the origin's depth and grows toward the camera", () => {
  assert.deepEqual(projectTo2D([0.5, -0.25, 0, 0]), [0.5, -0.25]);
  const near = projectTo2D([0.5, 0, 0.5]);
  const far = projectTo2D([0.5, 0, -0.5]);
  assert.ok(close(near[0], 0.5 * (CAMERA_DISTANCE / (CAMERA_DISTANCE - 0.5))));
  assert.ok(near[0] > 0.5 && far[0] < 0.5);
});

test("perspectiveScale is the factor projectTo2D applies", () => {
  const p = [0.3, -0.2, 0.4, 0.5];
  const projected = projectTo2D(p);
  const k = perspectiveScale(p);
  assert.ok(close(projected[0], p[0] * k) && close(projected[1], p[1] * k));
  assert.equal(perspectiveScale([0.1, 0.2, 0, 0]), 1);
});
