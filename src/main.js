import { reorthonormalize, rotate } from "./linalg.js";
import { canMove, cellCount, directionFromSwipe, move, newGame, spawn, WIN_VALUE } from "./game.js";
import { cellPosition, compassView, gridEdges, screenAxes } from "./board.js";
import { createRenderer } from "./renderer.js";

const AXIS_NAMES = ["x", "y", "z", "w"];
const SLIDE_MS = 150;
const POP_MS = 170;
const SWIPE_MIN_PX = 24;
// An axis pointing almost straight into the screen can't be picked by a swipe.
const MIN_AXIS_LENGTH = 0.12;
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
  won: false,
  over: false,
  overlay: null,
  R: compassView(),
  // Off by default: a still view keeps the eight swipe directions 45° apart.
  autoRotate: false,
  anim: null,
  highlight: null,
  positions: [],
  edges: [],
};

const start = () => {
  state.cells = newGame(state.side);
  state.score = 0;
  state.moves = 0;
  state.won = false;
  state.over = false;
  state.anim = null;
  state.positions = Array.from({ length: cellCount(state.side) }, (_, i) => cellPosition(i, state.side));
  state.edges = gridEdges(state.side);
  renderer.resetFit();
  setOverlay(null);
  updateScores();
};

const updateScores = () => {
  state.best = Math.max(state.best, state.score);
  $("score").textContent = String(state.score);
  $("best").textContent = String(state.best);
  $("moveCount").textContent = state.moves === 1 ? "1 move" : `${state.moves} moves`;
};

const setOverlay = (kind) => {
  state.overlay = kind;
  const overlay = $("overlay");
  if (!kind) {
    overlay.hidden = true;
    return;
  }
  const primary = $("overlayPrimary");
  if (kind === "win") {
    $("overlayTitle").textContent = "2048!";
    $("overlayText").textContent = `You reached ${WIN_VALUE} in ${state.moves} moves on a 4D board.`;
    primary.textContent = "Keep playing";
  } else {
    $("overlayTitle").textContent = "No moves left";
    $("overlayText").textContent = `No axis has equal neighbors. Score: ${state.score}.`;
    primary.textContent = "New game";
  }
  const wasHidden = overlay.hidden;
  overlay.hidden = false;
  if (wasHidden) primary.focus();
};

$("overlayPrimary").addEventListener("click", () => {
  if (state.overlay === "win") setOverlay(null);
  else start();
});

const play = (axis, dir) => {
  if (state.over || state.overlay) return;
  const result = move(state.cells, state.side, axis, dir);
  state.highlight = { axis, dir, until: performance.now() + 450 };
  if (!result.moved) return;
  state.cells = result.cells;
  const spawned = spawn(state.cells);
  state.score += result.gained;
  state.moves += 1;
  state.anim = {
    start: performance.now(),
    moves: result.moves,
    merged: new Set(result.merges.map((m) => m.at)),
    spawned,
  };
  updateScores();
  if (!state.won && result.merges.some((m) => m.value >= WIN_VALUE)) {
    state.won = true;
    setOverlay("win");
  } else if (!canMove(state.cells, state.side)) {
    state.over = true;
    setOverlay("over");
  }
};

const ease = (u) => 1 - (1 - u) * (1 - u);
const lerp = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);

const sceneTiles = (now) => {
  const anim = state.anim;
  const elapsed = anim ? now - anim.start : Infinity;
  if (anim && elapsed < SLIDE_MS) {
    const e = ease(elapsed / SLIDE_MS);
    return anim.moves.map((m) => ({ p: lerp(state.positions[m.from], state.positions[m.to], e), value: m.value, scale: 1 }));
  }
  const since = elapsed - SLIDE_MS;
  const tiles = [];
  state.cells.forEach((value, i) => {
    if (!value) return;
    let scale = 1;
    if (anim && since < POP_MS) {
      const u = since / POP_MS;
      if (i === anim.spawned) scale = u;
      else if (anim.merged.has(i)) scale = 1 + 0.2 * Math.sin(Math.PI * u);
    }
    tiles.push({ p: state.positions[i], value, scale });
  });
  return tiles;
};

const swipeAxes = () => screenAxes(state.R).map((v) => (Math.hypot(v[0], v[1]) < MIN_AXIS_LENGTH ? [0, 0] : v));

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
    tiles: sceneTiles(now),
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

let drag = null;
box.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".overlay")) return;
  drag = { x0: e.clientX, y0: e.clientY };
  box.setPointerCapture(e.pointerId);
});
box.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x0;
  const dy = e.clientY - drag.y0;
  drag = null;
  if (Math.hypot(dx, dy) < SWIPE_MIN_PX) return;
  // Screen y grows downward; board y grows upward.
  const chosen = directionFromSwipe([dx, -dy], swipeAxes());
  if (chosen) play(chosen.axis, chosen.dir);
});
box.addEventListener("pointercancel", () => {
  drag = null;
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
