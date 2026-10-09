import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALES } from "../src/locales/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const html = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const SITE = "https://guillhermm.github.io/4d-2048/";

const filesUnder = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
  );

const shell = () => JSON.parse(read("sw.js").match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
const meta = (attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

test("manifest has the fields an installable app needs", () => {
  assert.equal(manifest.name, "2048 4D");
  assert.equal(manifest.display, "standalone");
  for (const key of ["id", "start_url", "scope"]) assert.equal(manifest[key], "./");
  assert.ok(manifest.short_name && manifest.description && manifest.lang);
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  assert.deepEqual(manifest.categories, ["games"]);
});

test("manifest icons cover 192, 512 and maskable", () => {
  const find = (sizes, purpose) => manifest.icons.find((i) => i.sizes === sizes && (i.purpose ?? "any") === purpose);
  assert.ok(find("192x192", "any"));
  assert.ok(find("512x512", "any"));
  assert.ok(find("512x512", "maskable"));
  assert.ok(manifest.icons.some((i) => i.sizes === "any" && i.type === "image/svg+xml"));
});

test("the service worker precaches exactly what the page loads", () => {
  const localRef = (ref) => !/^(?:[a-z]+:|#)/i.test(ref);
  const expected = new Set([
    "./",
    "index.html",
    ...[...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map(([, ref]) => ref).filter(localRef),
    ...filesUnder("src").filter((f) => f.endsWith(".js")),
    ...manifest.icons.map(({ src }) => src),
    ...[...read("styles.css").matchAll(/url\(\s*["']?([^"')]+)/g)].map(([, url]) => url).filter(localRef),
  ]);
  assert.deepEqual([...shell()].sort(), [...expected].sort());
});

test("the service worker has one fixed cache and takes over at once", () => {
  const sw = read("sw.js");
  assert.equal([...sw.matchAll(/const CACHE = "([^"]+)"/g)].length, 1);
  assert.match(sw, /skipWaiting\(\)/);
  assert.match(sw, /clients\.claim\(\)/);
  assert.match(sw, /caches\.match\("index\.html"\)/);
});

test("main.js registers the worker behind a feature check", () => {
  const main = read("src/main.js");
  assert.match(main, /"serviceWorker" in navigator/);
  assert.match(main, /register\("sw\.js"\)\.catch/);
});

test("the head carries description, canonical, Open Graph and Twitter tags", () => {
  assert.ok(meta("name", "description").length > 50);
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}">`));
  assert.equal(meta("property", "og:url"), SITE);
  assert.equal(meta("property", "og:type"), "website");
  assert.ok(meta("property", "og:title") && meta("property", "og:description") && meta("property", "og:site_name"));
  assert.equal(meta("property", "og:image"), `${SITE}icons/og-image.png`);
  assert.equal(meta("property", "og:image:width"), "1200");
  assert.equal(meta("property", "og:image:height"), "630");
  assert.ok(meta("property", "og:image:alt"));
  assert.equal(meta("name", "twitter:card"), "summary_large_image");
});

test("theme-color metas cover light and dark, and the manifest is linked", () => {
  assert.match(html, /content="#eef1f5" media="\(prefers-color-scheme: light\)"/);
  assert.match(html, /content="#0f141b" media="\(prefers-color-scheme: dark\)"/);
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
});

test("the CSP is self-only for styles and fonts and names manifest and worker sources", () => {
  const csp = meta("http-equiv", "Content-Security-Policy");
  for (const directive of ["style-src 'self'", "font-src 'self'", "manifest-src 'self'", "worker-src 'self'"]) {
    assert.ok(csp.split(";").map((d) => d.trim()).includes(directive), `missing ${directive}`);
  }
  assert.ok(!html.includes("fonts.googleapis.com"));
});

test("the JSON-LD parses and describes a free web game", () => {
  const raw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const data = JSON.parse(raw);
  assert.equal(data["@type"], "VideoGame");
  assert.equal(data.url, SITE);
  assert.equal(data.image, `${SITE}icons/og-image.png`);
  assert.equal(data.gamePlatform, "Web browser");
  assert.equal(data.applicationCategory, "Game");
  assert.equal(data.operatingSystem, "Any");
  assert.equal(Number(data.offers.price), 0);
  assert.deepEqual(data.inLanguage, Object.keys(LOCALES));
});

test("the static HTML already has the English heading and intro text", () => {
  assert.match(html, /<h1>2048 4D<\/h1>/);
  const en = LOCALES.en.messages;
  for (const [, key, text] of html.matchAll(/data-i18n="(lede|caption|keyboardHint|settingsNote)">([^<]*)</g).map((m) => [m[0], m[1], m[2]])) {
    assert.equal(text, en[key], `static ${key} differs from en.js`);
  }
  assert.ok(html.includes(`>${en.lede}<`));
});

test("the sitemap lists the one canonical URL", () => {
  const xml = read("sitemap.xml");
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]), [SITE]);
  assert.ok(existsSync(join(root, "sitemap.xml")));
});
