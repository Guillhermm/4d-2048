// Network first, so a deploy shows up on the next load; the precached shell covers offline.
const CACHE = "4d-2048-v1";
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "src/board.js",
  "src/game.js",
  "src/i18n.js",
  "src/layout.js",
  "src/linalg.js",
  "src/locales/de.js",
  "src/locales/en.js",
  "src/locales/es.js",
  "src/locales/fr.js",
  "src/locales/index.js",
  "src/locales/pt-BR.js",
  "src/main.js",
  "src/preferences.js",
  "src/projection.js",
  "src/renderer.js",
  "src/settings.js",
  "src/theme-boot.js",
  "icons/icon.svg",
  "icons/favicon.svg",
  "icons/favicon-48.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "fonts/familjen-grotesk.woff2",
  "fonts/ibm-plex-mono-400.woff2",
  "fonts/ibm-plex-mono-500.woff2",
  "fonts/ibm-plex-mono-600.woff2",
  "fonts/ibm-plex-sans.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("index.html");
        return Response.error();
      }),
  );
});
