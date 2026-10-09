import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const pngSize = (path) => {
  const bytes = readFileSync(path);
  assert.ok(bytes.subarray(0, 8).equals(PNG_SIGNATURE), `${path} is not a PNG`);
  assert.equal(bytes.subarray(12, 16).toString("latin1"), "IHDR", `${path} has no IHDR first`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
};

const EXPECTED = {
  "favicon-48.png": [48, 48],
  "apple-touch-icon.png": [180, 180],
  "icon-192.png": [192, 192],
  "icon-512.png": [512, 512],
  "maskable-512.png": [512, 512],
  "og-image.png": [1200, 630],
};

test("every raster icon has the size its name promises", () => {
  for (const [file, [width, height]] of Object.entries(EXPECTED)) {
    const size = pngSize(join(root, "icons", file));
    assert.deepEqual([size.width, size.height], [width, height], file);
  }
});

test("the Apple touch icon has no alpha channel", () => {
  // Color types 4 and 6 carry alpha; iOS fills transparency with black.
  const { colorType } = pngSize(join(root, "icons", "apple-touch-icon.png"));
  assert.ok(colorType !== 4 && colorType !== 6, `color type ${colorType}`);
});

test("the SVG masters exist", () => {
  for (const file of ["icon.svg", "favicon.svg", "og.svg"]) {
    assert.ok(existsSync(join(root, "icons", file)), file);
  }
});

test("manifest icons exist and match their declared sizes", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
  assert.ok(manifest.icons?.length > 0, "manifest declares no icons");
  for (const icon of manifest.icons) {
    const path = join(root, icon.src);
    assert.ok(existsSync(path), `${icon.src} is missing`);
    if (icon.type) {
      const expected = icon.src.endsWith(".svg") ? "image/svg+xml" : "image/png";
      assert.equal(icon.type, expected, `${icon.src} type`);
    }
    if (icon.src.endsWith(".png")) {
      const { width, height } = pngSize(path);
      assert.equal(icon.sizes, `${width}x${height}`, `${icon.src} sizes`);
    }
  }
});

test("every @font-face url in styles.css exists", () => {
  const css = readFileSync(join(root, "styles.css"), "utf8");
  const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  assert.equal(faces.length, 5, `found ${faces.length} @font-face rules`);
  for (const face of faces) {
    assert.match(face, /font-display:\s*swap/);
    const url = face.match(/url\(\s*["']?([^"')]+)["']?\s*\)/)?.[1];
    assert.ok(url && /^fonts\/[\w-]+\.woff2$/.test(url), `unexpected src in ${face}`);
    assert.ok(existsSync(join(root, url)), `${url} is missing`);
  }
});

test("the variable fonts are declared once, over their weight range", () => {
  const css = readFileSync(join(root, "styles.css"), "utf8");
  for (const [file, range] of [["familjen-grotesk", "400 700"], ["ibm-plex-sans", "100 700"]]) {
    const face = (css.match(/@font-face\s*{[^}]*}/g) ?? []).find((f) => f.includes(`fonts/${file}.woff2`));
    assert.match(face ?? "", new RegExp(`font-weight:\\s*${range};`), file);
  }
});
