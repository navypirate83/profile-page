const STORAGE_KEY = "theme";
const SKILLS_KEY = "skills";
const MY_TIME_ZONE = "America/Los_Angeles";
const root = document.documentElement;

const skills = [
  { name: "Quality Control", level: "confident" },
  { name: "Lean Six Sigma Green Belt", level: "confident" },
  { name: "Database Management", level: "confident" },
  { name: "Root Cause Analysis", level: "confident" },
];

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

const SLIDE_TIME = 300;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function slideSection(details, open, whenDone) {
  const summary = details.querySelector("summary");
  details.dataset.state = open ? "open" : "closed";

  if (reduceMotion.matches) {
    details.open = open;
    whenDone?.();
    return;
  }

  const startHeight = details.offsetHeight;
  details.slide?.cancel();
  if (open) details.open = true;
  const endHeight = open ? details.offsetHeight : summary.offsetHeight;

  details.style.overflow = "hidden";
  details.slide = details.animate(
    { height: [`${startHeight}px`, `${endHeight}px`] },
    { duration: SLIDE_TIME, easing: "ease" }
  );
  details.slide.onfinish = () => {
    if (!open) details.open = false;
    details.style.overflow = "";
    details.slide = null;
    whenDone?.();
  };
}

function setUpSections() {
  const spacer = document.createElement("div");
  spacer.id = "scroll-spacer";
  spacer.setAttribute("aria-hidden", "true");
  document.body.append(spacer);
  addEventListener("scrollend", trimSpacer);

  document.querySelectorAll("main details").forEach((details) => {
    details.dataset.state = details.open ? "open" : "closed";
    details.querySelector("summary").addEventListener("click", (event) => {
      event.preventDefault();
      slideSection(details, details.dataset.state !== "open");
    });
  });
}

function trimSpacer() {
  const spacer = document.getElementById("scroll-spacer");
  const spacerTop = spacer.getBoundingClientRect().top + scrollY;
  const bodyBottomPadding = parseFloat(getComputedStyle(document.body).paddingBottom);
  const needed = scrollY > 0 ? scrollY + innerHeight - spacerTop - bodyBottomPadding : 0;
  spacer.style.height = `${Math.max(0, needed)}px`;
}

function waitForScrollToEnd() {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    addEventListener("scrollend", finish, { once: true });
    setTimeout(finish, 1000);
  });
}

async function goToSection(hash) {
  const section = hash ? document.querySelector(hash) : null;
  const details = section?.querySelector("details");
  if (!details) return;

  document.getElementById("scroll-spacer").style.height = `${innerHeight}px`;

  const gap = parseFloat(getComputedStyle(section).scrollMarginTop);
  if (Math.abs(section.getBoundingClientRect().top - gap) > 2) {
    section.scrollIntoView();
    await waitForScrollToEnd();
  }

  if (details.dataset.state !== "open") {
    await new Promise((resolve) => slideSection(details, true, resolve));
  }
  trimSpacer();
}

function updateCounts() {
  document.querySelectorAll(".char-count").forEach((counter) => {
    const box = document.getElementById(counter.dataset.for);
    counter.textContent = [...box.value].length;
  });
}

function addDeleteButton(item, name, onDelete) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete-button";
  button.setAttribute("aria-label", `Delete ${name}`);
  button.textContent = "✗";
  button.addEventListener("click", onDelete);
  item.append(button);
}

function addDragHandle(item, name, onMoved) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "drag-handle";
  handle.textContent = "⠿";
  handle.setAttribute("aria-label", `Move ${name}. Use the arrow keys to move it.`);
  handle.addEventListener("pointerdown", (event) => startDrag(event, item, onMoved));
  handle.addEventListener("keydown", (event) => moveWithKeys(event, item, handle, onMoved));
  item.prepend(handle);
}

function startDrag(event, item, onMoved) {
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
    onMoved();
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onDrop);
  document.addEventListener("pointercancel", onDrop);
}

function moveWithKeys(event, item, handle, onMoved) {
  const earlier = event.key === "ArrowUp" || event.key === "ArrowLeft";
  const later = event.key === "ArrowDown" || event.key === "ArrowRight";
  if (earlier && item.previousElementSibling) item.previousElementSibling.before(item);
  else if (later && item.nextElementSibling) item.nextElementSibling.after(item);
  else return;
  event.preventDefault();
  handle.focus();
  onMoved();
}

function saveSkills() {
  try { localStorage.setItem(SKILLS_KEY, JSON.stringify(skills)); } catch {}
}

function loadSavedSkills() {
  try {
    const saved = JSON.parse(localStorage.getItem(SKILLS_KEY));
    const levels = ["learning", "practicing", "confident"];
    const looksRight = Array.isArray(saved) && saved.every(
      (skill) => typeof skill?.name === "string" && levels.includes(skill?.level)
    );
    if (looksRight) skills.splice(0, skills.length, ...saved);
  } catch {}
}

function makeSkillName(item) {
  const skill = skills[item.dataset.index];
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill-name";
  button.textContent = skill.name;
  button.title = "Click to edit";
  button.setAttribute("aria-label", `Edit ${skill.name}`);
  button.addEventListener("click", () => editSkillName(item, button));
  return button;
}

function editSkillName(item, nameButton) {
  const skill = skills[item.dataset.index];
  const input = document.createElement("input");
  input.type = "text";
  input.className = "skill-name-input";
  input.value = skill.name;
  input.maxLength = 40;
  input.setAttribute("aria-label", "Skill name");
  nameButton.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;
  function finish(save, keepFocus) {
    if (finished) return;
    finished = true;
    const newName = input.value.trim();
    if (save && newName && newName !== skill.name) {
      skill.name = newName;
      saveSkills();
    }
    const newNameButton = makeSkillName(item);
    input.replaceWith(newNameButton);
    item.querySelector(".drag-handle").setAttribute("aria-label", `Move ${skill.name}. Use the arrow keys to move it.`);
    item.querySelector(".delete-button").setAttribute("aria-label", `Delete ${skill.name}`);
    if (keepFocus) newNameButton.focus();
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true, true);
    } else if (event.key === "Escape") {
      finish(false, true);
    }
  });
  input.addEventListener("blur", () => finish(true, false));
}

let activeFilter = "all";

function renderSkills() {
  const list = document.getElementById("skill-list");
  if (!list) return;
  const newSkillBox = document.getElementById("new-skill");
  const shownSkills = skills.filter((skill) => activeFilter === "all" || skill.level === activeFilter);
  document.getElementById("skill-count").textContent = `(${shownSkills.length}/${skills.length})`;
  list.dataset.filter = activeFilter;
  list.replaceChildren();

  shownSkills.forEach((skill) => {
    const item = document.createElement("li");
    item.dataset.index = skills.indexOf(skill);
    item.dataset.level = skill.level;

    const name = makeSkillName(item);

    const level = document.createElement("span");
    level.className = "skill-level";
    level.textContent = skill.level;

    item.append(name, level);
    addDragHandle(item, skill.name, syncSkillOrder);
    addDeleteButton(item, skill.name, () => {
      skills.splice(Number(item.dataset.index), 1);
      saveSkills();
      renderSkills();
      newSkillBox.focus();
    });
    list.append(item);
  });
}

function syncSkillOrder() {
  const cards = [...document.getElementById("skill-list").children];
  const movedSkills = cards.map((card) => skills[card.dataset.index]);
  const spots = cards.map((card) => Number(card.dataset.index)).sort((a, b) => a - b);
  spots.forEach((spot, i) => {
    skills[spot] = movedSkills[i];
    cards[i].dataset.index = spot;
  });
  saveSkills();
}

function setUpFilters() {
  const buttons = document.querySelectorAll(".filter-button");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      buttons.forEach((other) => other.setAttribute("aria-pressed", other === button));
      renderSkills();
    });
  });
}

function addProjectControls(item, name) {
  addDragHandle(item, name, () => {});
  addDeleteButton(item, name, () => {
    item.remove();
    document.getElementById("project-name").focus();
  });
}

function addProject(name, description) {
  const item = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = name;
  const text = document.createElement("p");
  text.textContent = description;
  item.append(title, text);
  addProjectControls(item, name);
  document.getElementById("project-list").append(item);
}

function setUpForms() {
  const skillForm = document.getElementById("skill-form");
  if (skillForm) skillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const box = document.getElementById("new-skill");
    const name = box.value.trim();
    const level = document.getElementById("new-skill-level").value;
    if (name) {
      skills.push({ name, level });
      saveSkills();
      renderSkills();
    }
    skillForm.reset();
    updateCounts();
    box.focus();
  });

  document.querySelectorAll("#project-list li").forEach((item) => {
    addProjectControls(item, item.querySelector("strong").textContent);
  });

  const projectForm = document.getElementById("project-form");
  if (projectForm) projectForm.addEventListener("submit", (event) => {
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

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      history.pushState(null, "", link.hash);
      goToSection(link.hash);
    });
  });
  setUpSections();
  goToSection(location.hash);

  document.addEventListener("input", updateCounts);
  document.querySelector("#contact form")?.addEventListener("reset", () => setTimeout(updateCounts, 0));

  loadSavedSkills();
  renderSkills();
  setUpFilters();
  setUpForms();
});
