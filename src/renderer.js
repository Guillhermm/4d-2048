import { applyMatrix } from "./linalg.js";
import { perspectiveScale, projectTo2D } from "./projection.js";
import { cellCount } from "./game.js";
import { cellPosition } from "./board.js";

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
