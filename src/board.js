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
