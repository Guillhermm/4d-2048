const box = document.getElementById("canvasBox");
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

// A canvas has its own pixel grid; matching it to the screen keeps lines sharp.
const draw = () => {
  const rect = box.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--ax-w").trim();
  ctx.beginPath();
  ctx.arc(rect.width / 2, rect.height / 2, 40, 0, Math.PI * 2);
  ctx.fill();
};

new ResizeObserver(draw).observe(box);
