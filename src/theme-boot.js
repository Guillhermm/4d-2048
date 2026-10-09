// Runs before the stylesheet applies, so a saved theme does not flash the other one first.
try {
  const saved = JSON.parse(localStorage.getItem("4d-2048") || "{}");
  if (saved && (saved.theme === "light" || saved.theme === "dark")) {
    document.documentElement.dataset.theme = saved.theme;
  }
} catch {
  // No storage: the page follows the system theme.
}
