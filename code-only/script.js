const STORAGE_KEY = "theme";

function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
  }
}

function getStartingTheme() {
  const saved = getSavedTheme();
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemPrefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function updateButton(button, theme) {
  button.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
}

applyTheme(getStartingTheme());

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("theme-toggle");

  updateButton(button, document.documentElement.getAttribute("data-theme"));

  button.addEventListener("click", function () {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
    updateButton(button, newTheme);
    saveTheme(newTheme);
  });
});
