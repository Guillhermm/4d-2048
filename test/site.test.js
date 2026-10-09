import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Must match the copy step in .github/workflows/pages.yml.
const PUBLISHED = ["index.html", "styles.css", "manifest.webmanifest", "sw.js", "sitemap.xml", "src", "icons", "fonts"];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isPublished = (path) => PUBLISHED.some((p) => path === p || path.startsWith(`${p}/`));

const localRefs = (html) =>
  [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)]
    .map(([, ref]) => ref)
    .filter((ref) => !/^(?:[a-z]+:|#)/i.test(ref));

const jsFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.name.endsWith(".js") ? [path] : [];
  });

test("the page references only relative paths, so it works under a project subpath", () => {
  const refs = localRefs(readFileSync(join(root, "index.html"), "utf8"));
  assert.ok(refs.length > 0);
  for (const ref of refs) assert.ok(!ref.startsWith("/"), `${ref} is root-absolute`);
});

test("everything the page loads is published and exists", () => {
  for (const ref of localRefs(readFileSync(join(root, "index.html"), "utf8"))) {
    assert.ok(isPublished(ref), `${ref} is not in the published set`);
    assert.ok(existsSync(join(root, ref)), `${ref} does not exist`);
  }
});

test("every module import resolves to a published file", () => {
  for (const file of jsFiles(join(root, "src"))) {
    const code = readFileSync(file, "utf8");
    for (const [, spec] of code.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      assert.ok(spec.startsWith("./") || spec.startsWith("../"), `${spec} in ${file} is not relative`);
      const target = relative(root, resolve(dirname(file), spec));
      assert.ok(isPublished(target), `${target} imported by ${file} is not published`);
      assert.ok(existsSync(join(root, target)), `${target} imported by ${file} does not exist`);
    }
  }
});

test("every file the stylesheet loads is relative, published and exists", () => {
  const css = readFileSync(join(root, "styles.css"), "utf8");
  const urls = [...css.matchAll(/url\(\s*["']?([^"')]+)/g)].map(([, u]) => u);
  assert.ok(urls.length > 0);
  for (const url of urls) {
    if (/^(?:data:|#)/.test(url)) continue;
    assert.ok(!/^(?:[a-z]+:|\/)/i.test(url), `styles.css loads ${url}, which is not relative`);
    assert.ok(isPublished(url), `${url} is not in the published set`);
    assert.ok(existsSync(join(root, url)), `${url} does not exist`);
  }
});

test("every icon the manifest names is published and exists", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
  for (const { src } of manifest.icons) {
    assert.ok(!src.startsWith("/"), `${src} is root-absolute`);
    assert.ok(isPublished(src), `${src} is not in the published set`);
    assert.ok(existsSync(join(root, src)), `${src} does not exist`);
  }
});
