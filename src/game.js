// Cells live in a flat array of length side^dims; index = sum of c_k * side^k.

export const DIMENSIONS = 4;
export const WIN_VALUE = 2048;

export const cellCount = (side, dims = DIMENSIONS) => side ** dims;

export const toCoords = (index, side, dims = DIMENSIONS) => {
  const c = new Array(dims);
  for (let k = 0; k < dims; k++) {
    c[k] = index % side;
    index = Math.floor(index / side);
  }
  return c;
};

export const toIndex = (coords, side) => {
  let index = 0;
  for (let k = coords.length - 1; k >= 0; k--) index = index * side + coords[k];
  return index;
};

export const emptyBoard = (side, dims = DIMENSIONS) => new Array(cellCount(side, dims)).fill(0);

// Every line parallel to `axis`, each one ordered from coordinate 0 to side - 1.
export const linesAlong = (axis, side, dims = DIMENSIONS) => {
  const lines = [];
  for (let i = 0; i < cellCount(side, dims); i++) {
    const c = toCoords(i, side, dims);
    if (c[axis] !== 0) continue;
    const line = [];
    for (let t = 0; t < side; t++) {
      c[axis] = t;
      line.push(toIndex(c, side));
    }
    lines.push(line);
  }
  return lines;
};

// Slides every line along `axis` toward `dir` (+1 means toward higher coordinates).
// A tile merges at most once per move, and the pair closest to the wall merges first.
export const move = (cells, side, axis, dir, dims = DIMENSIONS) => {
  const next = emptyBoard(side, dims);
  const moves = [];
  const merges = [];
  let gained = 0;
  for (const line of linesAlong(axis, side, dims)) {
    const ordered = dir > 0 ? [...line].reverse() : line;
    const result = [];
    for (const index of ordered) {
      const value = cells[index];
      if (!value) continue;
      const last = result[result.length - 1];
      if (last && last.value === value && !last.merged) {
        last.value *= 2;
        last.merged = true;
        last.sources.push({ index, value });
        gained += last.value;
      } else {
        result.push({ value, merged: false, sources: [{ index, value }] });
      }
    }
    result.forEach((tile, slot) => {
      const to = ordered[slot];
      next[to] = tile.value;
      for (const s of tile.sources) moves.push({ from: s.index, to, value: s.value });
      if (tile.merged) merges.push({ at: to, value: tile.value });
    });
  }
  const moved = next.some((v, i) => v !== cells[i]);
  return { cells: next, moved, gained, moves, merges };
};
