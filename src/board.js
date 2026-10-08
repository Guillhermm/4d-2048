import { dot, norm, scale, sub } from "./linalg.js";
import { cellCount, DIMENSIONS, toCoords, toIndex } from "./game.js";

// Each axis spans [-1/2, 1/2], so the side-2 board is the tesseract with circumradius 1.
export const cellPosition = (index, side) => {
  const half = (side - 1) / 2;
  return toCoords(index, side).map((c) => (c - half) / half / 2);
};

export const gridEdges = (side) => {
  const edges = [];
  for (let i = 0; i < cellCount(side); i++) {
    const c = toCoords(i, side);
    for (let axis = 0; axis < DIMENSIONS; axis++) {
      if (c[axis] === side - 1) continue;
      const n = [...c];
      n[axis] += 1;
      edges.push({ a: i, b: toIndex(n, side), axis });
    }
  }
  return edges;
};

// Screen direction of each axis at the center of the board. At the origin every perspective
// factor is 1, so this is just the first two components of R e_k.
export const screenAxes = (R) => Array.from({ length: R.length }, (_, k) => [R[0][k], R[1][k]]);

// A view where x, z, y and w point at 0°, 45°, 90° and 135° on screen, so the eight move
// directions are evenly spaced. The first two rows are fixed by those angles (they come out
// orthonormal because the sums of cos², sin² and cos·sin are 2, 2 and 0); the other two
// complete the basis.
export const compassView = () => {
  const angles = [0, 90, 45, 135].map((deg) => (deg * Math.PI) / 180);
  const c = Math.SQRT1_2;
  const rows = [angles.map((a) => c * Math.cos(a)), angles.map((a) => c * Math.sin(a))];
  for (let k = 0; k < 4 && rows.length < 4; k++) {
    let v = Array.from({ length: 4 }, (_, i) => (i === k ? 1 : 0));
    for (const r of rows) v = sub(v, scale(r, dot(v, r)));
    const len = norm(v);
    if (len > 1e-6) rows.push(scale(v, 1 / len));
  }
  return rows;
};

// For each signed axis, how far a swipe aimed exactly along its arrow can stray before another
// direction wins: half the angle to the nearest other arrow, in degrees. An axis whose vector is
// zero (seen end-on) gets 0. Entries are ordered +x, -x, +y, -y, ...
export const swipeTolerances = (axisVectors) => {
  const arrows = [];
  axisVectors.forEach((v, axis) => {
    for (const dir of [1, -1]) arrows.push({ axis, dir, x: v[0] * dir, y: v[1] * dir });
  });
  const live = arrows.filter((a) => Math.hypot(a.x, a.y) > 1e-6);
  return arrows.map((a) => {
    if (Math.hypot(a.x, a.y) <= 1e-6) return { axis: a.axis, dir: a.dir, degrees: 0 };
    let nearest = 180;
    for (const b of live) {
      if (b === a) continue;
      const cos = (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));
      nearest = Math.min(nearest, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
    }
    return { axis: a.axis, dir: a.dir, degrees: nearest / 2 };
  });
};
