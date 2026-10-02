export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const sub = (a, b) => a.map((x, i) => x - b[i]);
export const scale = (a, k) => a.map((x) => x * k);
export const norm = (a) => Math.sqrt(dot(a, a));

export const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

// Rotates R in place by `angle` in the plane spanned by axes i and j.
export const rotate = (R, i, j, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ri = R[i];
  const rj = R[j];
  for (let k = 0; k < ri.length; k++) {
    const a = ri[k];
    const b = rj[k];
    ri[k] = c * a - s * b;
    rj[k] = s * a + c * b;
  }
};

// Gram-Schmidt on the rows. Called now and then to undo floating-point drift.
export const reorthonormalize = (R) => {
  for (let i = 0; i < R.length; i++) {
    for (let j = 0; j < i; j++) {
      const d = dot(R[i], R[j]);
      for (let k = 0; k < R.length; k++) R[i][k] -= d * R[j][k];
    }
    const len = norm(R[i]);
    for (let k = 0; k < R.length; k++) R[i][k] /= len;
  }
};

export const applyMatrix = (R, v) => R.map((row) => dot(row, v));
