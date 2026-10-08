import { applyMatrix } from "./linalg.js";
import { perspectiveScale, projectTo2D } from "./projection.js";
import { cellCount } from "./game.js";
import { cellPosition, screenAxes } from "./board.js";
import { fitScale } from "./layout.js";

const AXIS_LABELS = ["x", "y", "z", "w"];
// The axis indicator is drawn around this point from the bottom-left corner, labels included.
const INDICATOR_CENTER = 58;
const INDICATOR_REACH = 54;

const MIN_FONT_PX = 11;

// Powers of two from 16384 up are shown in binary thousands: 16k, 32k, 64k, 128k.
export const tileLabel = (value) => (value >= 16384 ? `${value / 1024}k` : String(value));

const parseHex = (hex) => {
  const s = hex.replace("#", "");
  return [0, 2, 4].map((o) => parseInt(s.slice(o, o + 2), 16));
};

export const createRenderer = (canvas, box) => {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let fit = null;
  let colors = null;

  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    const token = (name) => cs.getPropertyValue(name).trim();
    colors = {
      axes: ["--ax-x", "--ax-y", "--ax-z", "--ax-w"].map(token),
      tileLow: parseHex(token("--tile-low")),
      tileHigh: parseHex(token("--tile-high")),
      onLight: token("--tile-ink-light"),
      onDark: token("--tile-ink-dark"),
      empty: token("--muted"),
    };
  };

  const tileColor = (value) => {
    const t = Math.min(1, Math.max(0, (Math.log2(value) - 1) / 10));
    const { tileLow: a, tileHigh: b } = colors;
    const fill = `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * t)).join(",")})`;
    return { fill, ink: t > 0.4 ? colors.onDark : colors.onLight };
  };

  const resize = () => {
    const rect = box.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawAxisIndicator = (R, highlight) => {
    const ox = INDICATOR_CENTER;
    const oy = height - INDICATOR_CENTER;
    const len = 40;
    ctx.font = "500 12px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    screenAxes(R).forEach(([x, y], axis) => {
      const lit = highlight && highlight.axis === axis;
      const sign = lit ? highlight.dir : 1;
      const ex = ox + x * len * sign;
      const ey = oy - y * len * sign;
      ctx.strokeStyle = colors.axes[axis];
      ctx.fillStyle = colors.axes[axis];
      ctx.globalAlpha = lit ? 1 : 0.8;
      ctx.lineWidth = lit ? 3.5 : 2;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, lit ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      const label = `${sign > 0 ? "+" : "−"}${AXIS_LABELS[axis]}`;
      ctx.fillText(label, ox + x * (len + 12) * sign, oy - y * (len + 12) * sign);
    });
    ctx.globalAlpha = 1;
  };

  // Positions in `tiles` are world coordinates; they are rotated and projected here.
  // `obstacles` are rectangles in view pixels that the board must stay clear of.
  const draw = ({ side, R, edges, tiles, highlight, obstacles = [] }) => {
    ctx.clearRect(0, 0, width, height);
    const tileHalf = 0.11;
    const cells = [];
    let rx = 0;
    let ry = 0;
    for (let i = 0; i < cellCount(side); i++) {
      const world = applyMatrix(R, cellPosition(i, side));
      const screen = projectTo2D(world);
      const f = perspectiveScale(world);
      cells.push({ screen, f });
      rx = Math.max(rx, Math.abs(screen[0]) + tileHalf * Math.sqrt(f));
      ry = Math.max(ry, Math.abs(screen[1]) + tileHalf * Math.sqrt(f));
    }
    const indicator = {
      x: INDICATOR_CENTER - INDICATOR_REACH,
      y: height - INDICATOR_CENTER - INDICATOR_REACH,
      w: 2 * INDICATOR_REACH,
      h: 2 * INDICATOR_REACH,
    };
    const target = fitScale({ width, height, rx, ry, obstacles: [...obstacles, indicator] });
    const ease = (from, to) => from + (to - from) * 0.05;
    fit = fit == null ? target : { k: ease(fit.k, target.k), cx: ease(fit.cx, target.cx), cy: ease(fit.cy, target.cy) };
    const { k, cx, cy } = fit;
    const at = (s) => [cx + s[0] * k, cy - s[1] * k];

    ctx.lineCap = "round";
    for (const e of edges) {
      const a = cells[e.a];
      const b = cells[e.b];
      const depth = Math.min(1, Math.max(0, ((a.f + b.f) / 2 - 0.6) / 1.2));
      const [ax, ay] = at(a.screen);
      const [bx, by] = at(b.screen);
      ctx.strokeStyle = colors.axes[e.axis];
      ctx.globalAlpha = 0.25 + 0.5 * depth;
      ctx.lineWidth = 1 + 1.5 * depth;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    ctx.fillStyle = colors.empty;
    ctx.globalAlpha = 0.35;
    for (const c of cells) {
      const [x, y] = at(c.screen);
      ctx.beginPath();
      ctx.arc(x, y, 2 + 1.5 * c.f, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const baseSize = k * tileHalf * 2;
    const placed = tiles
      .map((t) => {
        const world = applyMatrix(R, t.p);
        return { screen: projectTo2D(world), f: perspectiveScale(world), value: t.value, scale: t.scale };
      })
      .sort((a, b) => a.f - b.f);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of placed) {
      // The square root keeps depth readable without near tiles burying the ones behind them.
      const size = baseSize * Math.sqrt(t.f) * t.scale;
      if (size < 1) continue;
      const [x, y] = at(t.screen);
      const { fill, ink } = tileColor(t.value);
      const label = tileLabel(t.value);
      const fontScale = label.length <= 2 ? 0.46 : label.length === 3 ? 0.38 : 0.3;
      // Text never drops below a readable size; a tile too narrow for it grows wider instead.
      const fontPx = Math.max(MIN_FONT_PX * t.scale, size * fontScale);
      ctx.font = `600 ${Math.round(fontPx)}px 'IBM Plex Mono', monospace`;
      const h = Math.max(size, fontPx * 1.5);
      const w = Math.max(h, ctx.measureText(label).width + fontPx * 0.8);
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, h * 0.18);
      else ctx.rect(x - w / 2, y - h / 2, w, h);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillText(label, x, y + h * 0.02);
    }

    drawAxisIndicator(R, highlight);
  };

  return {
    readColors,
    resize,
    draw,
    resetFit() {
      fit = null;
    },
  };
};
