import { identity, reorthonormalize, rotate } from "./linalg.js";
import { gridEdges } from "./board.js";
import { createRenderer } from "./renderer.js";

const AUTO_ROTATION = [
  [0, 3, 0.1],
  [1, 2, 0.06],
];

const $ = (id) => document.getElementById(id);
const box = $("canvasBox");
const renderer = createRenderer($("board"), box);

// Tilted a little so that z and w are not seen end-on.
const tiltedView = () => {
  const R = identity(4);
  rotate(R, 0, 2, 0.6);
  rotate(R, 1, 2, -0.4);
  rotate(R, 0, 3, 0.9);
  rotate(R, 1, 3, 0.5);
  return R;
};

const state = {
  // The engine handles any side; the game ships the 2×2×2×2 board only.
  side: 2,
  R: tiltedView(),
  autoRotate: true,
  edges: gridEdges(2),
};

let lastTime = performance.now();
let frame = 0;
const tick = (now) => {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (state.autoRotate) {
    for (const [i, j, speed] of AUTO_ROTATION) rotate(state.R, i, j, speed * dt);
  }
  if (++frame % 120 === 0) reorthonormalize(state.R);
  renderer.draw({
    side: state.side,
    R: state.R,
    edges: state.edges,
  });
  requestAnimationFrame(tick);
};

new ResizeObserver(() => renderer.resize()).observe(box);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => renderer.readColors());

renderer.readColors();
renderer.resize();
requestAnimationFrame(tick);
