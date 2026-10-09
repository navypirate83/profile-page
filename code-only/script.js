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

function openSection(hash) {
  if (hash) document.querySelector(`${hash} details`)?.setAttribute("open", "");
}

function updateCounts() {
  document.querySelectorAll(".char-count").forEach((counter) => {
    const box = document.getElementById(counter.dataset.for);
    counter.textContent = [...box.value].length;
  });
}

function addDeleteButton(item, name, nextFocus) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete-button";
  button.setAttribute("aria-label", `Delete ${name}`);
  button.textContent = "✗";
  button.addEventListener("click", () => {
    item.remove();
    nextFocus.focus();
  });
  item.append(button);
}

function addDragHandle(item, name) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "drag-handle";
  handle.textContent = "⠿";
  handle.setAttribute("aria-label", `Move ${name}. Use the arrow keys to move it.`);
  handle.addEventListener("pointerdown", (event) => startDrag(event, item));
  handle.addEventListener("keydown", (event) => moveWithKeys(event, item, handle));
  item.prepend(handle);
}

function startDrag(event, item) {
  event.preventDefault();
  const list = item.parentElement;
  item.classList.add("dragging");
  root.classList.add("is-dragging");

  function onMove(moveEvent) {
    const x = moveEvent.clientX;
    const y = moveEvent.clientY;
    const target = [...list.children].find((other) => {
      if (other === item) return false;
      const box = other.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    });
    if (!target) return;
    const box = target.getBoundingClientRect();
    const sideBySide = box.width < list.clientWidth * 0.9;
    const afterIt = sideBySide ? x > box.left + box.width / 2 : y > box.top + box.height / 2;
    if (afterIt) target.after(item);
    else target.before(item);
  }

  function onDrop() {
    item.classList.remove("dragging");
    root.classList.remove("is-dragging");
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onDrop);
    document.removeEventListener("pointercancel", onDrop);
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onDrop);
  document.addEventListener("pointercancel", onDrop);
}

function moveWithKeys(event, item, handle) {
  const earlier = event.key === "ArrowUp" || event.key === "ArrowLeft";
  const later = event.key === "ArrowDown" || event.key === "ArrowRight";
  if (earlier && item.previousElementSibling) item.previousElementSibling.before(item);
  else if (later && item.nextElementSibling) item.nextElementSibling.after(item);
  else return;
  event.preventDefault();
  handle.focus();
}

function addItemControls(item, name, nextFocus) {
  addDragHandle(item, name);
  addDeleteButton(item, name, nextFocus);
}

function addSkill(text) {
  const item = document.createElement("li");
  item.textContent = text;
  addItemControls(item, text, document.getElementById("new-skill"));
  document.getElementById("skill-list").append(item);
}

function addProject(name, description) {
  const item = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = name;
  const text = document.createElement("p");
  text.textContent = description;
  item.append(title, text);
  addItemControls(item, name, document.getElementById("project-name"));
  document.getElementById("project-list").append(item);
}

function setUpManagers() {
  document.querySelectorAll("#skill-list li").forEach((item) => {
    addItemControls(item, item.textContent.trim(), document.getElementById("new-skill"));
  });
  document.querySelectorAll("#project-list li").forEach((item) => {
    addItemControls(item, item.querySelector("strong").textContent, document.getElementById("project-name"));
  });

  const skillForm = document.getElementById("skill-form");
  skillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const box = document.getElementById("new-skill");
    const skill = box.value.trim();
    if (skill) addSkill(skill);
    skillForm.reset();
    updateCounts();
    box.focus();
  });

  const projectForm = document.getElementById("project-form");
  projectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nameBox = document.getElementById("project-name");
    const name = nameBox.value.trim();
    const description = document.getElementById("project-description").value.trim();
    if (name && description) addProject(name, description);
    projectForm.reset();
    updateCounts();
    nameBox.focus();
  });
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

  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", () => openSection(link.hash));
  });
  openSection(location.hash);

  document.addEventListener("input", updateCounts);
  document.querySelector("#contact form").addEventListener("reset", () => setTimeout(updateCounts, 0));

  setUpManagers();
});
