# 2048 4D

2048 played on a real four-dimensional board. The 2×2×2×2 board is the 16 vertices of a
tesseract, drawn in perspective, with each grid edge colored by its axis.

Existing 4D versions of 2048 lay the board out as a flat grid of small grids. Here the board is
the geometry: a move along w slides tiles along the w edges, and you see it happen.

## Playing

- **Swipe** (or drag with a mouse) toward where an axis points on screen. The axis indicator in
  the bottom-left corner shows the current direction of +x, +y, +z and +w; the move goes along the
  signed axis closest to your swipe.
- **When a direction is hard to swipe**: with the view still, if some arrow is within 8° of
  another (or points straight at you), a note in the top-left corner of the board names it and
  points to the buttons or to resetting the view. It stays quiet while the board rotates by
  itself, where that happens about half the time.
- **Turning the view**: the button in the bottom-right corner of the board switches dragging from
  moving tiles to turning the view. While it is on, the chip next to it picks whether x and y
  turn toward w or z.
- **Keyboard**: arrows for x and y, W/S for z, A/D for w. Keys are read by physical position, so
  on AZERTY the same keys are Z/S and Q/D, and the on-screen hints follow the selected language.
- **Buttons**: one per signed axis, colored like the edges.

On a phone the score and New game sit above the board. Tile numbers never shrink below a
readable size (a tile widens instead), and values from 16384 up read 16k, 32k and so on.

Tiles merge only along an edge, as in the original game along a row. Two equal tiles on opposite
corners of a face are not neighbors and never merge in one move.

The default view puts x, z, y and w at 0°, 45°, 90° and 135° on screen, so the eight move
directions are evenly spaced and the 16 cells land on distinct points. The two buttons in the
board's top-right corner start or pause rotation by itself, which is off by default because
turning the board changes which axis a swipe picks, and bring the default view back.

## Settings

The gear button opens the settings: appearance (system, light or dark) and language. English is
the default, with Brazilian Portuguese, Spanish, French and German, each listed in its own
language. Both choices are saved in `localStorage`, together with the best score.
Without storage (a private window, for example) the game still works and saves nothing.

The game itself is saved after every move and new game, under the same key, and comes back on
reload: board, score, moves and whether the 2048 card was already shown. A saved game that fails
validation (wrong cell count, a tile that is not a power of two, a bad score) is dropped whole.
Settings also credit the author, with links to GitHub, LinkedIn and a personal website.

## Game over

When no move is left, a card shows the result with New game and See board. See board (or Escape)
closes it so the final position can be looked at; the score card then shows a Game over badge and a
Result button that brings the card back. A finished game restores from a reload in that state,
without the card. On a win, Escape is the same as Keep playing.

## Running

ES modules do not load from `file://`, so serve the folder:

```sh
npm run serve        # http://127.0.0.1:8000
```

## Deploying

`.github/workflows/pages.yml` publishes to GitHub Pages on every push to `main`: it runs the
tests, copies `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js`, `sitemap.xml`, `src/`,
`icons/` and `fonts/` into the site, and deploys that. Nothing else in the repository is published. In the repository settings, Pages must have its source set to
GitHub Actions.

## Install, offline and search

The page is an installable Progressive Web App: `manifest.webmanifest` describes it and `sw.js`
is a service worker that fetches from the network first and falls back to a precached copy of
every file the page needs, so the game opens offline. Bump `CACHE` in `sw.js` only if the cache
layout changes; `test/pwa.test.js` fails when the precache list and the published files differ.
Fonts are self-hosted in `fonts/`, so the page makes no third-party requests: Familjen Grotesk
and IBM Plex Sans are variable fonts, one file each, and IBM Plex Mono is three static weights.
`fonts/OFL.txt` is their license; it is published with them but not precached.

For search and link previews, `index.html` carries a description, canonical URL, Open Graph and
Twitter tags, and `VideoGame` structured data (JSON-LD), and the intro text is in the static HTML
in English, so crawlers see it without running scripts. `sitemap.xml` lists the one page; there
is no `robots.txt` because it is only read at a host root, which a project subpath does not own.

## Tests

```sh
npm test
```

`node --test`, no dependencies. Covered: the move and merge rules on every axis, game over,
spawning, picking an axis from a swipe, the board geometry and the default view, fitting the
board around the on-board buttons, projection,
rotation, every translation (same keys and placeholders as English), and loading saved
preferences and games, including corrupt or hostile values, that every file the page and stylesheet load is in
the published site under a relative path, the manifest, the icon sizes, the service worker precache
list, and the search tags in the page head.

## Layout

| Path | What it does |
|---|---|
| `src/game.js` | Rules on an n-dimensional grid: moves, merges, spawning, game over, swipe to axis |
| `src/board.js` | Cell positions, grid edges, screen axes and the default view |
| `src/renderer.js` | Canvas drawing of the board, tiles and axis indicator |
| `src/layout.js` | Fits the board in the view while keeping it clear of the on-board buttons |
| `src/projection.js` | Perspective projection from 4D to the screen |
| `src/linalg.js` | Plane rotations and Gram-Schmidt |
| `src/i18n.js`, `src/locales/` | Translations |
| `src/settings.js` | The settings dialog and applying the theme |
| `src/preferences.js`, `src/theme-boot.js` | Saved settings; the boot script applies the theme before the first paint |
| `src/main.js` | State, input and animation |

No dependencies and no build step. `index.html` sets a Content Security Policy that allows only
its own scripts and Google Fonts.
