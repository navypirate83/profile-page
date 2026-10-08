const STORAGE_KEY = "theme";
const MY_TIME_ZONE = "America/Los_Angeles";
const root = document.documentElement;

function getSavedTheme() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function saveTheme(theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  document.getElementById("theme-toggle")?.setAttribute("aria-checked", theme === "dark");
}

let startTheme = getSavedTheme();
if (startTheme !== "light" && startTheme !== "dark") {
  startTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
applyTheme(startTheme);

function formatClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { text: `${p.day}/${p.month}/${p.year} | ${p.hour}:${p.minute}`, zone: p.timeZoneName };
}

function createClocks() {
  const clocks = document.createElement("p");
  clocks.className = "clocks";
  clocks.innerHTML = `
    <span class="clock"><span class="clock-label">Local time</span><time id="clock-visitor"></time></span>
    <span class="clock"><span class="clock-label" id="clock-mine-label">My time</span><time id="clock-mine"></time></span>`;
  document.querySelector("header h1").before(clocks);
}

function updateClocks() {
  const now = new Date();
  const mine = formatClock(now, MY_TIME_ZONE);
  document.getElementById("clock-visitor").textContent = formatClock(now).text;
  document.getElementById("clock-mine").textContent = mine.text;
  document.getElementById("clock-mine-label").textContent = `My time (${mine.zone})`;
  document.querySelectorAll(".clocks time").forEach((clock) => clock.setAttribute("datetime", now.toISOString()));
}

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
