/*
  ============================================================
  FILE OVERVIEW: script.js, the light/dark theme switch
  ============================================================
  JavaScript makes the page interactive. This file does three jobs:
    1. Figures out which theme to start with (a saved choice, or the
       computer's own light/dark setting) and applies it right away.
    2. Updates the slide switch so its knob sits on the sun (light)
       or the moon (dark).
    3. Switches the theme when the button is clicked, and remembers
       the choice for next time.

  How the theme is applied: this code puts data-theme="light" or
  data-theme="dark" on the <html> element. styles.css has a set of
  dark colors that switch on whenever data-theme="dark" is there.

  Comments here use // for one line or slash-star for several lines.
  The browser skips them.
*/


// ===== SETTINGS =====

// The name the theme choice is saved under in the browser's storage (localStorage).
// localStorage is a small storage space each website gets in the visitor's browser.
// Anything saved there is still there after the page is closed and opened again.
const STORAGE_KEY = "theme";

// ===== END OF SETTINGS =====


// ===== HELPER FUNCTIONS =====

// Reads the saved theme ("light" or "dark") from the browser's storage.
// It's wrapped in try/catch because some browsers block storage (for example in
// private browsing). If reading fails, it returns null ("nothing saved")
// instead of crashing the page.
function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

// Saves the chosen theme to the browser's storage. Also wrapped in try/catch,
// so the button still works even if saving isn't allowed. The choice just won't be remembered.
function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // Saving isn't allowed here, so there's nothing to do. The theme still changes for this visit.
  }
}

// Picks the theme to start with:
//   - if the visitor chose one before, use that;
//   - otherwise, follow the computer's own setting. matchMedia asks the browser
//     "is the system set to dark mode?" and .matches is true or false.
function getStartingTheme() {
  const saved = getSavedTheme();
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemPrefersDark ? "dark" : "light";
}

// Applies a theme by setting data-theme on the <html> element.
// document.documentElement is JavaScript's name for the <html> element.
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Updates the slide switch to match the theme by setting aria-checked:
//   - "true" in dark mode (the switch is "on"): styles.css slides the knob to the moon;
//   - "false" in light mode (the switch is "off"): the knob sits on the sun.
// Screen readers also read aria-checked, announcing "Dark theme, on" or "off".
function updateButton(button, theme) {
  button.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
}

// ===== END OF HELPER FUNCTIONS =====


// ===== STEP 1: APPLY THE STARTING THEME IMMEDIATELY =====
// This runs as soon as the browser reads this file, which is in the <head>, before
// the page is drawn. Doing it this early stops the page from flashing light colors
// for a moment before switching to dark.
applyTheme(getStartingTheme());
// ===== END OF STEP 1 =====


// ===== STEP 2 AND 3: SET UP THE BUTTON ONCE THE PAGE HAS LOADED =====
// The button doesn't exist yet while the <head> is being read, so we wait for the
// "DOMContentLoaded" event, which the browser fires when all the HTML has been read.
document.addEventListener("DOMContentLoaded", function () {
  // Find the slide switch by its id.
  const button = document.getElementById("theme-toggle");

  // Put the knob on the right side for the theme that's already applied.
  updateButton(button, document.documentElement.getAttribute("data-theme"));

  // When the switch is clicked: work out the opposite theme, apply it,
  // slide the knob, and save the choice so it's remembered next visit.
  button.addEventListener("click", function () {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
    updateButton(button, newTheme);
    saveTheme(newTheme);
  });
});
// ===== END OF STEP 2 AND 3 =====
