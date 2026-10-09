import { languageName, languages } from "./i18n.js";

export const THEME_OPTIONS = ["system", "light", "dark"];
export const THEME_LABELS = { system: "themeSystem", light: "themeLight", dark: "themeDark" };

const SVG = "http://www.w3.org/2000/svg";

// "system" leaves the attribute off so the prefers-color-scheme rules in styles.css apply.
export const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else delete root.dataset.theme;
};

const checkIcon = () => {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "icon settings-check");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG, "use");
  use.setAttribute("href", "#i-check");
  svg.append(use);
  return svg;
};

const optionItem = (setting, value, label, checked) => {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `settings-option${checked ? " active" : ""}`;
  btn.setAttribute("role", "radio");
  btn.setAttribute("aria-checked", String(checked));
  btn.dataset.setting = setting;
  btn.dataset.value = value;
  const text = document.createElement("span");
  text.textContent = label;
  btn.append(text, checkIcon());
  li.append(btn);
  return li;
};

// `current()` returns { theme, language }; the callbacks persist and apply a change.
export const createSettings = ({ dialog, translate, current, onThemeChange, onLanguageChange }) => {
  const themeList = dialog.querySelector("#themeOptions");
  const languageList = dialog.querySelector("#languageOptions");

  const render = () => {
    const { theme, language } = current();
    themeList.replaceChildren(
      ...THEME_OPTIONS.map((value) => optionItem("theme", value, translate(THEME_LABELS[value]), value === theme))
    );
    // Each language keeps its own name, so a reader lost in the wrong language can still find theirs.
    languageList.replaceChildren(
      ...languages().map((code) => optionItem("language", code, languageName(code), code === language))
    );
  };

  dialog.addEventListener("click", (e) => {
    // A click on the backdrop lands on the dialog element itself.
    if (e.target === dialog) {
      dialog.close();
      return;
    }
    const btn = e.target.closest(".settings-option");
    if (!btn) return;
    const { setting, value } = btn.dataset;
    if (setting === "theme") onThemeChange(value);
    else onLanguageChange(value);
    render();
    dialog.querySelector(`[data-setting="${setting}"][data-value="${value}"]`)?.focus();
  });

  return {
    render,
    open() {
      render();
      dialog.showModal();
    },
  };
};
