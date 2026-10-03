// Cells live in a flat array of length side^dims; index = sum of c_k * side^k.

export const DIMENSIONS = 4;

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
