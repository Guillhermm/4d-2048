import { applyMatrix } from "./linalg.js";
import { perspectiveScale, projectTo2D } from "./projection.js";
import { cellCount } from "./game.js";
import { cellPosition, screenAxes } from "./board.js";

const AXIS_LABELS = ["x", "y", "z", "w"];
// The axis indicator is drawn around this point from the bottom-left corner, labels included.
const INDICATOR_CENTER = 58;

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
      empty: token("--muted"),
    };
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

  const draw = ({ side, R, edges }) => {
    ctx.clearRect(0, 0, width, height);
    const tileHalf = 0.1;
    const cells = [];
    let rx = 0;
    let ry = 0;
    for (let i = 0; i < cellCount(side); i++) {
      const world = applyMatrix(R, cellPosition(i, side));
      const screen = projectTo2D(world);
      const f = perspectiveScale(world);
      cells.push({ screen, f });
      rx = Math.max(rx, Math.abs(screen[0]) + tileHalf * f);
      ry = Math.max(ry, Math.abs(screen[1]) + tileHalf * f);
    }
    const target = { k: Math.min((width / 2 - 24) / rx, (height / 2 - 24) / ry), cx: width / 2, cy: height / 2 };
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

    drawAxisIndicator(R);
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
