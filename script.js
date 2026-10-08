/*
  ============================================================
  FILE OVERVIEW: script.js, the light/dark theme switch and the two clocks
  ============================================================
  JavaScript makes the page interactive. This file does two things:
    1. THEME: picks the starting theme (a saved choice, or the computer's
       own light/dark setting), applies it right away, and switches it when
       the slide switch is clicked, remembering the choice for next time.
    2. CLOCKS: adds two clocks to the top of the page (the visitor's local
       time and my Pacific time) and updates them every second.

  How the theme is applied: this code puts data-theme="light" or
  data-theme="dark" on the <html> element. styles.css has a set of
  dark colors that switch on whenever data-theme="dark" is there.

  A few modern JavaScript shortcuts are used below:
    - () => { ... }   is an "arrow function": a shorter way to write function () { ... }.
    - `text ${value}` (with backticks) is a "template literal": it drops a value
                      straight into text, instead of joining pieces with +.
    - a?.b()          is "optional chaining": it runs b() only if a exists, and
                      quietly does nothing if a is missing.

  Comments here use // for one line or slash-star for several lines.
  The browser skips them.
*/


// ===== SETTINGS =====
// STORAGE_KEY  = the name the theme choice is saved under in the browser's storage
//                (localStorage: a small space each website gets in the visitor's browser
//                that keeps its contents after the page is closed).
// MY_TIME_ZONE = the official name for Pacific time (Everett, WA). Using the zone name,
//                not a fixed number of hours, means daylight saving is handled
//                automatically: PST in winter, PDT in summer.
// root         = a short name for the <html> element, which this file uses a lot.
const STORAGE_KEY = "theme";
const MY_TIME_ZONE = "America/Los_Angeles";
const root = document.documentElement;
// ===== END OF SETTINGS =====


// ===== THEME =====

// Reads or saves the theme choice. Both are wrapped in try/catch because some browsers
// block storage (for example in private browsing). If that happens, reading returns
// null ("nothing saved") and saving quietly does nothing, so the page never crashes.
function getSavedTheme() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function saveTheme(theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
}

// Applies a theme:
//   - root.dataset.theme = theme sets data-theme="light" or "dark" on <html>,
//     which switches the colors in styles.css.
//   - It also sets the slide switch's aria-checked to "true" (dark) or "false" (light),
//     which slides its knob and tells screen readers whether it's on. The ?. skips this
//     step when the switch doesn't exist yet (the first time this runs, from the <head>,
//     the page's HTML hasn't been read yet).
function applyTheme(theme) {
  root.dataset.theme = theme;
  document.getElementById("theme-toggle")?.setAttribute("aria-checked", theme === "dark");
}

// RIGHT AWAY (before the page is drawn, since this file loads in the <head>): use the
// saved choice if there is one; otherwise follow the computer's own setting.
// matchMedia asks the browser "is the system set to dark mode?" (.matches is true or false).
// Doing this early stops the page from flashing the wrong colors for a moment.
let startTheme = getSavedTheme();
if (startTheme !== "light" && startTheme !== "dark") {
  startTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
applyTheme(startTheme);
// ===== END OF THEME =====


// ===== CLOCKS =====

// Turns a moment in time into the clock text "DD/MMM/YYYY | HH:MM" (e.g. "07/Oct/2026 | 14:05")
// plus the short time-zone code (e.g. "PDT").
//   date     = the moment to show.
//   timeZone = which zone to show it in. Leaving it out means "the visitor's own zone,"
//              taken from their device's settings.
// Intl.DateTimeFormat is the browser's built-in date formatter. formatToParts gives back
// each piece separately, as a list like [{type: "day", value: "07"}, ...].
// Object.fromEntries turns that list into an easy lookup: p.day = "07", p.month = "Oct", and so on.
// The options: 2-digit day, short month name (Oct), 4-digit year, 2-digit hour and minute,
// hourCycle "h23" = 24-hour time (00-23), and timeZoneName "short" = the zone code.
function formatClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { text: `${p.day}/${p.month}/${p.year} | ${p.hour}:${p.minute}`, zone: p.timeZoneName };
}

// Builds the two clocks and places them in the header, just above my name (<h1>).
// They're created here instead of being written in index.html, so they only exist when
// JavaScript is running, and they're filled in straight away (never empty or showing dashes).
//   - document.createElement("p") makes a new, empty <p> paragraph.
//   - className = "clocks" gives it the class styles.css uses to lay it out.
//   - innerHTML = `...` fills it with this HTML:
//       two .clock <span>s, each holding a small label and a <time> element (the HTML tag
//       meant for dates and times). updateClocks fills in each <time> and my label.
//   - .before(clocks) inserts the paragraph right before the <h1>.
function createClocks() {
  const clocks = document.createElement("p");
  clocks.className = "clocks";
  clocks.innerHTML = `
    <span class="clock"><span class="clock-label">Local time</span><time id="clock-visitor"></time></span>
    <span class="clock"><span class="clock-label" id="clock-mine-label">My time</span><time id="clock-mine"></time></span>`;
  document.querySelector("header h1").before(clocks);
}

// Writes the current time into both clocks:
//   - the visible text of each <time> element,
//   - my clock's label, with the current zone code ("My time (PDT)"),
//   - each <time> element's datetime attribute: the same moment in a standard
//     computer-readable form (toISOString gives e.g. "2026-10-07T21:05:00.000Z").
function updateClocks() {
  const now = new Date();
  const mine = formatClock(now, MY_TIME_ZONE);
  document.getElementById("clock-visitor").textContent = formatClock(now).text;
  document.getElementById("clock-mine").textContent = mine.text;
  document.getElementById("clock-mine-label").textContent = `My time (${mine.zone})`;
  document.querySelectorAll(".clocks time").forEach((clock) => clock.setAttribute("datetime", now.toISOString()));
}
// ===== END OF CLOCKS =====


// ===== ONCE THE PAGE HAS LOADED =====
// The switch and the clocks don't exist yet while the <head> is being read, so this waits
// for "DOMContentLoaded", which the browser fires once all the HTML has been read. Then:
//   1. applyTheme again, so the switch's knob matches the theme already applied above.
//   2. Clicking the switch flips to the opposite theme, applies it, and saves the choice.
//   3. The clocks are created and filled in right away, then setInterval reruns
//      updateClocks every 1000 milliseconds (1 second) while the page is open. The clocks only show minutes, but checking every second means the
//      minute changes within a second of the real clock.
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(root.dataset.theme);

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const newTheme = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
    saveTheme(newTheme);
  });

  createClocks();
  updateClocks();
  setInterval(updateClocks, 1000);
});
// ===== END OF ONCE THE PAGE HAS LOADED =====
