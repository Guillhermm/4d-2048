// Runs before the stylesheet applies, so a saved theme does not flash the other one first.
const THEME_COLORS = { light: "#eef1f5", dark: "#0f141b" };

// The media-query metas only follow the system; a manual choice overrides both.
const syncThemeColor = () => {
  const theme = document.documentElement.dataset.theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.dataset.system ??= meta.content;
    meta.content = THEME_COLORS[theme] ?? meta.dataset.system;
  }
};

try {
  const saved = JSON.parse(localStorage.getItem("4d-2048") || "{}");
  if (saved && (saved.theme === "light" || saved.theme === "dark")) {
    document.documentElement.dataset.theme = saved.theme;
  }
} catch {
  // No storage: the page follows the system theme.
}

// This script runs in the head, before the metas are parsed, so sync once the document is ready.
document.addEventListener("DOMContentLoaded", syncThemeColor);
new MutationObserver(syncThemeColor).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});
