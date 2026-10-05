import { reorthonormalize, rotate } from "./linalg.js";
import { canMove, cellCount, move, newGame, spawn } from "./game.js";
import { cellPosition, compassView, gridEdges } from "./board.js";
import { createRenderer } from "./renderer.js";

const AXIS_NAMES = ["x", "y", "z", "w"];
const AUTO_ROTATION = [
  [0, 3, 0.1],
  [1, 2, 0.06],
];
// event.code is the physical key, so these stay put on AZERTY and QWERTZ layouts.
const KEYS = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowDown: [1, -1],
  ArrowUp: [1, 1],
  KeyS: [2, -1],
  KeyW: [2, 1],
  KeyA: [3, -1],
  KeyD: [3, 1],
};

const $ = (id) => document.getElementById(id);
const box = $("canvasBox");
const renderer = createRenderer($("board"), box);

const state = {
  // The engine handles any side; the game ships the 2×2×2×2 board only.
  side: 2,
  cells: null,
  score: 0,
  best: 0,
  moves: 0,
  over: false,
  R: compassView(),
  // Off by default: a still view keeps the eight swipe directions 45° apart.
  autoRotate: false,
  highlight: null,
  positions: [],
  edges: [],
};

const start = () => {
  state.cells = newGame(state.side);
  state.score = 0;
  state.moves = 0;
  state.over = false;
  state.positions = Array.from({ length: cellCount(state.side) }, (_, i) => cellPosition(i, state.side));
  state.edges = gridEdges(state.side);
  renderer.resetFit();
  updateScores();
};

const updateScores = () => {
  state.best = Math.max(state.best, state.score);
  $("score").textContent = String(state.score);
  $("best").textContent = String(state.best);
  $("moveCount").textContent = state.moves === 1 ? "1 move" : `${state.moves} moves`;
};

const play = (axis, dir) => {
  if (state.over) return;
  const result = move(state.cells, state.side, axis, dir);
  state.highlight = { axis, dir, until: performance.now() + 450 };
  if (!result.moved) return;
  state.cells = result.cells;
  spawn(state.cells);
  state.score += result.gained;
  state.moves += 1;
  updateScores();
  if (!canMove(state.cells, state.side)) state.over = true;
};

const sceneTiles = () => {
  const tiles = [];
  state.cells.forEach((value, i) => {
    if (value) tiles.push({ p: state.positions[i], value, scale: 1 });
  });
  return tiles;
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
  if (state.highlight && now > state.highlight.until) state.highlight = null;
  renderer.draw({
    side: state.side,
    R: state.R,
    edges: state.edges,
    tiles: sceneTiles(),
    highlight: state.highlight,
  });
  requestAnimationFrame(tick);
};

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const mapped = KEYS[e.code];
  if (!mapped) return;
  e.preventDefault();
  play(mapped[0], mapped[1]);
});

const buildPad = () => {
  const pad = $("pad");
  AXIS_NAMES.forEach((name, axis) => {
    for (const dir of [-1, 1]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = `move-${dir > 0 ? "plus" : "minus"}-${name}`;
      btn.className = `pad-btn axis-${name}`;
      const label = document.createElement("span");
      label.textContent = `${dir > 0 ? "+" : "−"}${name}`;
      const key = document.createElement("kbd");
      key.textContent = keyLabel(axis, dir);
      btn.setAttribute("aria-label", `Move toward ${label.textContent}`);
      btn.append(label, key);
      btn.addEventListener("click", () => play(axis, dir));
      pad.append(btn);
    }
  });
};

const keyLabel = (axis, dir) => {
  if (axis === 0) return dir > 0 ? "→" : "←";
  if (axis === 1) return dir > 0 ? "↑" : "↓";
  if (axis === 2) return dir > 0 ? "W" : "S";
  return dir > 0 ? "D" : "A";
};

$("newGame").addEventListener("click", start);

new ResizeObserver(() => renderer.resize()).observe(box);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => renderer.readColors());

buildPad();
renderer.readColors();
renderer.resize();
start();
requestAnimationFrame(tick);
