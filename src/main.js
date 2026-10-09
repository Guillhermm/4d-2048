import { reorthonormalize, rotate } from "./linalg.js";
import { canMove, cellCount, directionFromSwipe, move, newGame, spawn, WIN_VALUE } from "./game.js";
import { cellPosition, compassView, gridEdges, screenAxes, swipeTolerances } from "./board.js";
import { createRenderer } from "./renderer.js";
import { DEFAULT_LANGUAGE, languages, translate } from "./i18n.js";
import { browserStorage, loadPreferences, savePreferences } from "./preferences.js";
import { applyTheme, createSettings } from "./settings.js";

const AXIS_NAMES = ["x", "y", "z", "w"];
const SLIDE_MS = 150;
const POP_MS = 170;
const SWIPE_MIN_PX = 24;
// An axis pointing almost straight into the screen can't be picked by a swipe.
const MIN_AXIS_LENGTH = 0.12;
// A swipe aimed at an arrow may stray this many degrees either way before it is warned about.
const MIN_SWIPE_TOLERANCE = 8;
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
const storage = browserStorage();
const prefs = loadPreferences(storage, languages());

const state = {
  language: prefs.language ?? DEFAULT_LANGUAGE,
  // The engine handles any side; the game ships the 2×2×2×2 board only.
  side: 2,
  cells: null,
  score: 0,
  moves: 0,
  won: false,
  over: false,
  overlay: null,
  R: compassView(),
  // Off by default: a still view keeps the eight swipe directions 45° apart.
  autoRotate: false,
  dragMode: "move",
  rotateAxis: 3,
  anim: null,
  highlight: null,
  positions: [],
  edges: [],
};

const t = (key, params) => translate(state.language, key, params);

const best = () => prefs.best[state.side] ?? 0;

const saveGame = () => {
  const { side, cells, score, moves, won, over } = state;
  prefs.game = { side, cells: [...cells], score, moves, won, over };
  savePreferences(storage, prefs);
};

const updateOverUi = () => {
  $("overBadge").hidden = !state.over;
  $("reopenOver").hidden = !state.over;
};

// `saved` is a validated game from storage; a finished one comes back dismissed, with no overlay.
const start = (saved = null) => {
  state.cells = saved ? saved.cells : newGame(state.side);
  state.score = saved?.score ?? 0;
  state.moves = saved?.moves ?? 0;
  state.won = saved?.won ?? false;
  state.over = saved?.over ?? false;
  state.anim = null;
  state.positions = Array.from({ length: cellCount(state.side) }, (_, i) => cellPosition(i, state.side));
  state.edges = gridEdges(state.side);
  renderer.resetFit();
  setOverlay(null);
  updateOverUi();
  updateScores();
  saveGame();
};

const updateScores = () => {
  if (state.score > best()) {
    prefs.best[state.side] = state.score;
    savePreferences(storage, prefs);
  }
  $("score").textContent = String(state.score);
  $("best").textContent = String(best());
  $("moveCount").textContent = t("moves", { count: state.moves });
};

const setOverlay = (kind) => {
  state.overlay = kind;
  const overlay = $("overlay");
  if (!kind) {
    overlay.hidden = true;
    return;
  }
  const primary = $("overlayPrimary");
  $("overlayDismiss").hidden = kind === "win";
  if (kind === "win") {
    $("overlayTitle").textContent = t("winTitle");
    $("overlayText").textContent = t("winText", { value: WIN_VALUE, moves: state.moves });
    primary.textContent = t("keepPlaying");
  } else {
    $("overlayTitle").textContent = t("overTitle");
    $("overlayText").textContent = t("overText", { score: state.score });
    primary.textContent = t("newGame");
  }
  const wasHidden = overlay.hidden;
  overlay.hidden = false;
  if (wasHidden) primary.focus();
};

const keepPlaying = () => {
  setOverlay(null);
  // A win on the last free move can leave no moves; the game-over card follows.
  if (state.over) setOverlay("over");
  else $("newGame").focus();
};

$("overlayPrimary").addEventListener("click", () => {
  if (state.overlay === "win") keepPlaying();
  else start();
});

const dismissOverlay = () => {
  if (state.overlay === "win") {
    keepPlaying();
    return;
  }
  setOverlay(null);
  $("newGame").focus();
};

$("overlayDismiss").addEventListener("click", dismissOverlay);
$("reopenOver").addEventListener("click", () => setOverlay("over"));

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
  state.over = !canMove(state.cells, state.side);
  const justWon = !state.won && result.merges.some((m) => m.value >= WIN_VALUE);
  if (justWon) state.won = true;
  updateScores();
  updateOverUi();
  saveGame();
  if (justWon) {
    setOverlay("win");
  } else if (state.over) {
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

let hintText = "";
const updateSwipeHint = () => {
  // While the board turns by itself the weak directions change every second, so a warning
  // would flicker; it is only shown for a still view.
  const weak =
    state.dragMode === "move" && !state.autoRotate
      ? swipeTolerances(swipeAxes())
          .filter((w) => w.degrees < MIN_SWIPE_TOLERANCE)
          .map((w) => `${w.dir > 0 ? "+" : "−"}${AXIS_NAMES[w.axis]}`)
      : [];
  const text = weak.length ? t("swipeWarning", { directions: weak.join(", ") }) : "";
  if (text === hintText) return;
  hintText = text;
  const hint = $("swipeHint");
  hint.textContent = text;
  hint.hidden = !text;
  measureControls();
};

// The on-board buttons, in view pixels. Measured on resize and whenever the chip shows or hides.
let controlRects = [];
const measureControls = () => {
  const origin = box.getBoundingClientRect();
  controlRects = [...box.querySelectorAll(".view-controls")]
    .filter((el) => !el.hidden)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
    });
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
  updateSwipeHint();
  renderer.draw({
    side: state.side,
    R: state.R,
    edges: state.edges,
    tiles: sceneTiles(now),
    highlight: state.highlight,
    obstacles: controlRects,
  });
  requestAnimationFrame(tick);
};

window.addEventListener("keydown", (e) => {
  if ($("settings").open) return;
  if (e.code === "Escape" && state.overlay) {
    dismissOverlay();
    return;
  }
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const mapped = KEYS[e.code];
  if (!mapped) return;
  e.preventDefault();
  play(mapped[0], mapped[1]);
});

let drag = null;
box.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".overlay, .view-controls")) return;
  drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
  box.setPointerCapture(e.pointerId);
});
box.addEventListener("pointermove", (e) => {
  if (!drag || state.dragMode !== "rotate") return;
  const axis = state.rotateAxis;
  rotate(state.R, 0, axis, (e.clientX - drag.x) * 0.01);
  rotate(state.R, 1, axis, -(e.clientY - drag.y) * 0.01);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
box.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x0;
  const dy = e.clientY - drag.y0;
  drag = null;
  if (state.dragMode !== "move" || Math.hypot(dx, dy) < SWIPE_MIN_PX) return;
  // Screen y grows downward; board y grows upward.
  const chosen = directionFromSwipe([dx, -dy], swipeAxes());
  if (chosen) play(chosen.axis, chosen.dir);
});
box.addEventListener("pointercancel", () => {
  drag = null;
});

const padButtons = [];
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
      btn.append(label, key);
      btn.addEventListener("click", () => play(axis, dir));
      pad.append(btn);
      padButtons.push({ btn, key, axis, dir, name });
    }
  });
};

const keyLabel = (axis, dir) => {
  if (axis === 0) return dir > 0 ? "→" : "←";
  if (axis === 1) return dir > 0 ? "↑" : "↓";
  const keys = t("keys");
  return keys[`${AXIS_NAMES[axis]}${dir > 0 ? "Plus" : "Minus"}`];
};

const settings = createSettings({
  dialog: $("settings"),
  translate: (key) => t(key),
  current: () => ({ theme: prefs.theme ?? "system", language: state.language }),
  onThemeChange(theme) {
    prefs.theme = theme;
    savePreferences(storage, prefs);
    applyTheme(theme);
  },
  onLanguageChange(language) {
    state.language = language;
    prefs.language = language;
    savePreferences(storage, prefs);
    applyLanguage();
  },
});
$("openSettings").addEventListener("click", () => settings.open());
$("closeSettings").addEventListener("click", () => $("settings").close());

const applyLanguage = () => {
  document.documentElement.lang = state.language;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
  for (const { btn, key, axis, dir, name } of padButtons) {
    btn.setAttribute("aria-label", t("moveToward", { direction: `${dir > 0 ? "+" : "−"}${name}` }));
    key.textContent = keyLabel(axis, dir);
  }
  updateScores();
  updateViewControls();
  hintText = "";
  updateSwipeHint();
  if (state.overlay) setOverlay(state.overlay);
  if ($("settings").open) settings.render();
};

const updateViewControls = () => {
  const rotating = state.dragMode === "rotate";
  $("dragMode").setAttribute("aria-pressed", String(rotating));
  $("autoRotate").setAttribute("aria-pressed", String(state.autoRotate));
  const chip = $("rotateAxis");
  const name = AXIS_NAMES[state.rotateAxis];
  chip.hidden = !rotating;
  chip.textContent = `→ ${name}`;
  chip.setAttribute("aria-label", t("rotateAxis", { axis: name }));
  chip.title = t("rotateAxis", { axis: name });
  measureControls();
};

$("dragMode").addEventListener("click", () => {
  state.dragMode = state.dragMode === "move" ? "rotate" : "move";
  updateViewControls();
});
$("rotateAxis").addEventListener("click", () => {
  state.rotateAxis = state.rotateAxis === 3 ? 2 : 3;
  updateViewControls();
});
$("autoRotate").addEventListener("click", () => {
  state.autoRotate = !state.autoRotate;
  updateViewControls();
});
$("alignView").addEventListener("click", () => {
  state.R = compassView();
  renderer.resetFit();
});
$("newGame").addEventListener("click", () => start());

new ResizeObserver(() => {
  renderer.resize();
  measureControls();
}).observe(box);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => renderer.readColors());
new MutationObserver(() => renderer.readColors()).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

buildPad();
renderer.readColors();
renderer.resize();
start(prefs.game);
applyLanguage();
requestAnimationFrame(tick);

// Offline support is an extra: a failed registration must never touch the game.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
