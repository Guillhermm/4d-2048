const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Fits a board with half-extents rx, ry (in board units) into a width × height view and returns
// { k, cx, cy }: the scale and the board's center in view pixels. The board's bounding box stays
// off every obstacle rectangle. Obstacles sit near the edges, so clearing them means giving up
// either a top and a bottom band or a left and a right band, each as tall or wide as the
// obstacles on that side need; the center moves to the middle of what is left. Whichever choice
// keeps the board bigger wins.
export const fitScale = ({ width, height, rx, ry, obstacles = [], margin = 24, gap = 8 }) => {
  const centered = { k: Math.min((width / 2 - margin) / rx, (height / 2 - margin) / ry), cx: width / 2, cy: height / 2 };
  const box = ({ k, cx, cy }) => ({ x: cx - rx * k, y: cy - ry * k, w: 2 * rx * k, h: 2 * ry * k });
  if (!obstacles.some((o) => intersects(box(centered), o))) return centered;

  let top = margin;
  let bottom = margin;
  let left = margin;
  let right = margin;
  for (const o of obstacles) {
    if (o.y + o.h / 2 < height / 2) top = Math.max(top, o.y + o.h + gap);
    else bottom = Math.max(bottom, height - o.y + gap);
    if (o.x + o.w / 2 < width / 2) left = Math.max(left, o.x + o.w + gap);
    else right = Math.max(right, width - o.x + gap);
  }
  const bands = {
    k: Math.min((width / 2 - margin) / rx, (height - top - bottom) / 2 / ry),
    cx: width / 2,
    cy: top + (height - top - bottom) / 2,
  };
  const sides = {
    k: Math.min((width - left - right) / 2 / rx, (height / 2 - margin) / ry),
    cx: left + (width - left - right) / 2,
    cy: height / 2,
  };
  const best = bands.k >= sides.k ? bands : sides;
  return { ...best, k: Math.max(0, best.k) };
};
