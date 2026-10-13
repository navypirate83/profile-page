/*
  ============================================================
  FILE OVERVIEW: script.js, the light/dark theme switch and the two clocks
  ============================================================
  JavaScript makes the page interactive. This file does five things:
    1. THEME: picks the starting theme (a saved choice, or the computer's
       own light/dark setting), applies it right away, and switches it when
       the slide switch is clicked, remembering the choice for next time.
    2. CLOCKS: adds two clocks to the top of the page (the visitor's local
       time and my Pacific time) and updates them every second.
    3. SECTIONS: slides each section open and closed (over 0.3 seconds) when
       its heading is clicked. A nav link first shifts the page so its section
       is at the top, then slides the section open.
    4. FORMS: keeps the small character counters under each text box up to date.
    5. SKILLS AND PROJECTS: draws the skill cards from the skills array
       (renderSkills), filters them by level with the filter buttons, shows
       the "shown/total" skill count in the heading, lets a skill's
       name be clicked to edit it, saves the skills in the visitor's browser so
       they're remembered after a reload, adds new skills and projects from their forms, gives
       every card a red X button to delete it, and lets cards be dragged into
       a new order by their grip handle.

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
// SKILLS_KEY   = the name the skills list is saved under in that same storage.
// root         = a short name for the <html> element, which this file uses a lot.
const STORAGE_KEY = "theme";
const SKILLS_KEY = "skills";
const MY_TIME_ZONE = "America/Los_Angeles";
const root = document.documentElement;

// skills = the list of skills shown in the Skills section. It's an "array" (a list in
// square brackets [ ]), and each item is an "object" (curly brackets { }) with two
// "properties" (named pieces of information):
//   name  = the skill's name, shown on its card.
//   level = how comfortable I am with it: "learning", "practicing", or "confident".
// The page is built from this list by renderSkills() (see SKILLS below). Adding,
// deleting, and reordering skills on the page all update this list, and each change is
// saved in the visitor's browser (localStorage), so it's still there after a reload.
// These four are the STARTING skills: they're used the first time someone visits (or if
// their saved list can't be read). Once a visitor has a saved list, theirs is used instead.
const skills = [
  { name: "Quality Control", level: "confident" },
  { name: "Lean Six Sigma Green Belt", level: "confident" },
  { name: "Database Management", level: "confident" },
  { name: "Root Cause Analysis", level: "confident" },
];
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


// ===== OPEN/CLOSE SECTIONS (with a sliding animation) =====
// Each section's content sits in a <details> box. On its own, the browser snaps a box open
// or shut instantly when its heading is clicked. This code takes over that click so the box
// SLIDES open or closed instead, over 0.3 seconds.

// SLIDE_TIME = how long the slide takes, in milliseconds (1000 = 1 second, so 300 = 0.3s).
// reduceMotion = whether the visitor has turned on "reduce motion" in their computer's
// settings. If so, boxes open and close instantly, with no sliding.
const SLIDE_TIME = 300;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

// Slides one section's box open (open = true) or closed (open = false).
// How the slide works:
//   - The box's height is measured before and after the change: startHeight is its
//     height right now; endHeight is its full height when open, or just the heading's
//     height when closed.
//   - animate() then smoothly changes the box's height from startHeight to endHeight over
//     SLIDE_TIME, with "ease" (starts and ends gently). overflow: hidden hides the content
//     that doesn't fit yet, so it's revealed (or covered) as the box grows (or shrinks).
//   - When OPENING, the box is opened first (so its content exists to be revealed).
//     When CLOSING, the box is only really closed after the slide finishes, so the
//     content stays visible while it slides away.
//   - dataset.state remembers where the box is heading ("open" or "closed"), so a click in
//     the middle of a slide reverses it. The previous slide is cancelled, and the new one
//     starts from wherever the box is at that moment.
//   - whenDone (optional) is a function to run once the slide has finished (goToSection
//     uses it to know when the slide is over). The ?.() runs it only if one was given.
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

// Connects every section's heading. Clicking a heading (or pressing Enter or Space on it):
//   - event.preventDefault() stops the browser's instant open/close;
//   - slideSection() slides the box the other way from where it's heading now.
// dataset.state starts as the box's current state ("closed", since every section starts closed).
// It also adds the empty spacer at the end of the page (used by goToSection below), and
// trims it whenever the visitor finishes scrolling, so extra space never hangs around.
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

// GOING TO A SECTION BY ITS LINK (like #skills): first the page SHIFTS so the section sits
// at the top of the screen, THEN the section slides open.

// The problem this solves: while sections are closed, the page is short. Near the bottom
// there isn't enough page left to scroll a section all the way to the top of the screen.
// So, just for the move, an invisible "spacer" at the very end of the page makes the page
// longer. Afterwards the spacer shrinks back to only what's needed, and keeps shrinking as
// the visitor scrolls back up, so no blank space is left behind.
//   - spacer = an empty <div> added after the footer (in setUpSections below).
//     aria-hidden="true" hides it from screen readers, since it's only empty space.

// Shrinks the spacer to the smallest height that keeps the page where it is right now.
// It works out how tall the page must be for the current scroll position to still fit
// (scrollY = how far down the page is scrolled; innerHeight = the window's height), takes
// away everything that isn't the spacer, and keeps the rest (never less than 0).
// At the very top of the page (scrollY is 0) nothing needs holding in place, so the
// spacer goes away completely.
function trimSpacer() {
  const spacer = document.getElementById("scroll-spacer");
  const spacerTop = spacer.getBoundingClientRect().top + scrollY;
  const bodyBottomPadding = parseFloat(getComputedStyle(document.body).paddingBottom);
  const needed = scrollY > 0 ? scrollY + innerHeight - spacerTop - bodyBottomPadding : 0;
  spacer.style.height = `${Math.max(0, needed)}px`;
}

// Waits until the page has stopped scrolling. It returns a "Promise": a way of saying
// "this finishes later." The browser fires a "scrollend" event when a scroll is done.
// Just in case it never fires (some browsers don't have it, or the page was already in
// place), the wait also ends after 1 second (setTimeout). "done" makes sure it ends once.
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

// Shifts the page to a section, then slides it open.
//   hash = the part of a link after the # (e.g. "#skills"). querySelector finds the section
//   with that id, and the <details> box inside it. If there's no such section, nothing happens.
// "async" lets this function pause with "await" until something finishes, then carry on:
//   1. The spacer is made one window-height tall, so there's always enough page to scroll.
//   2. If the section isn't already at the top (its scroll-margin-top gap from styles.css),
//      scrollIntoView() glides it there ("scroll-behavior: smooth" in styles.css; it jumps
//      instantly for "reduce motion" visitors), and "await" waits for that to finish.
//   3. If the section is closed, it slides open, and "await" waits for the slide to end
//      (slideSection's "when done" step resolves the Promise).
//   4. trimSpacer() takes away the extra space that's no longer needed.
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
// ===== END OF OPEN/CLOSE SECTIONS =====


// ===== CHARACTER COUNTS AND EMAIL CHECK =====
// Updates every character counter (the <small class="char-count"> under each text box).
// Each counter's data-for value is the id of its box, e.g. data-for="email".
// [...box.value].length counts the characters typed. (The [... ] splits the text into
// characters first, so an emoji counts as 1 instead of 2.)
// The red email text needs no JavaScript: styles.css handles it with :invalid.
function updateCounts() {
  document.querySelectorAll(".char-count").forEach((counter) => {
    const box = document.getElementById(counter.dataset.for);
    counter.textContent = [...box.value].length;
  });
}
// ===== END OF CHARACTER COUNTS AND EMAIL CHECK =====


// ===== SKILLS AND PROJECTS =====
// Skill and project cards are built with document.createElement (which makes a new, empty
// HTML element) and textContent (which fills it with plain text). textContent is used on
// purpose instead of innerHTML: whatever a visitor types is always shown as plain text,
// so typing something like <b> can never be treated as real HTML code.

// ----- CARD CONTROLS (shared by skills and projects) -----

// Adds a red X delete button to the end of a card.
//   item     = the <li> card to add the button to.
//   name     = what the card is called, for the button's screen-reader label ("Delete Quality Control").
//   onDelete = what to do when it's clicked (a function). Skills remove themselves from the
//              skills array and redraw the list; projects simply remove their card.
// The button shows a "✗" (a "ballot X" character, which looks hand-drawn); styles.css makes
// it red. The aria-label gives screen readers a clear name, instead of reading out the symbol.
function addDeleteButton(item, name, onDelete) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete-button";
  button.setAttribute("aria-label", `Delete ${name}`);
  button.textContent = "✗";
  button.addEventListener("click", onDelete);
  item.append(button);
}

// Every skill and project gets a grip handle ("⠿") in its top-left corner. Grabbing the
// grip and dragging moves the card to a new spot within its own list (skills stay with
// skills, projects with projects). It works with a mouse, a finger, or a pen, because it
// uses "pointer events", which treat all three the same way.

// Adds the grip handle to the start of a card.
//   item    = the <li> card to add it to.  name = what it's called, for the screen-reader label.
//   onMoved = what to do after the card has been moved (a function). Skills use it to put
//             the skills array in the same new order; projects don't need anything.
// It's a <button> so keyboard users can reach it with Tab; they move the card with the
// arrow keys instead of dragging (see moveWithKeys below).
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

// Runs while a card is being dragged, from the moment the grip is pressed until it's let go.
//   - event.preventDefault() stops the browser from selecting text while dragging.
//   - The card gets the "dragging" class (styles.css makes it see-through with a dashed
//     outline) and the page gets "is-dragging" (a "grabbing hand" pointer everywhere).
//   - onMove runs every time the pointer moves. It looks for another card in the same
//     list that the pointer is over. If it finds one, it moves the dragged card to just
//     before or just after it, depending on which half of that card the pointer is on.
//     The cards rearrange live, so you see the new order while you drag.
//       * In the skills grid, cards sit side by side, so "which half" is left or right.
//       * In the projects list, cards are stacked, so "which half" is top or bottom.
//       * A card narrower than the whole list must be in a grid row, so that decides it.
//   - onDrop runs when the button or finger is released: it removes the classes, stops
//     listening, and calls onMoved so the list's data can catch up with the new order.
//     "pointercancel" (e.g. the phone interrupts) is treated the same.
//   The listeners go on the whole document, not the grip, so the drag keeps working even
//   while the card (and its grip) are being moved around the page.
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

// Moves a card with the keyboard while its grip is focused:
//   Up or Left arrow  = one place earlier.   Down or Right arrow = one place later.
// previousElementSibling / nextElementSibling are the cards just before and after this one.
// Moving a card takes it out of the page for an instant, which drops the keyboard focus,
// so handle.focus() puts focus straight back on the grip, ready for the next key press.
// event.preventDefault() stops the arrow keys from also scrolling the page.
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
// ----- END OF CARD CONTROLS -----


// ----- SKILLS (built from the skills array) -----

// SAVING THE SKILLS in the visitor's browser (localStorage), so added, deleted, and
// reordered skills are still there after the page is reloaded or reopened.
// localStorage can only store text, not lists of objects, so:
//   - JSON.stringify(skills) turns the array into text when saving, e.g.
//     '[{"name":"HTML","level":"confident"}]'
//   - JSON.parse(text) turns that text back into an array when loading.
// Both are wrapped in try/catch, like the theme, because some browsers block storage
// (for example in private browsing). If saving fails, the page still works; the changes
// just won't be remembered.
function saveSkills() {
  try { localStorage.setItem(SKILLS_KEY, JSON.stringify(skills)); } catch {}
}

// Loads the saved skills (if there are any) into the skills array, replacing the four
// starting skills. Before using the saved list, it checks that it's sensible: it must be
// an array, and every item must have a name (text) and one of the three known levels.
// If nothing is saved, or the saved text is broken or doesn't pass the check, the
// starting skills are kept. splice(0, skills.length, ...saved) swaps the array's
// whole contents for the saved list.
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

// INLINE EDITING: a skill's name is a button. Clicking it swaps the name for a text box
// so it can be renamed right there on the card.

// Builds the clickable name for a skill card.
//   item = the skill's <li> card. Its data-index says which skill in the array it shows.
// It's a <button> (not plain text) so it can be clicked, and reached with the Tab key and
// opened with Enter by keyboard users. title shows a "Click to edit" tip when the mouse
// rests on it, and aria-label tells screen readers what clicking does ("Edit HTML").
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

// Swaps a skill's name for a text box, and handles saving or cancelling the edit.
//   - replaceWith() puts the text box exactly where the name was. It starts filled with
//     the current name, all selected (select()), so typing replaces it straight away.
//   - Enter, or clicking anywhere else (the box "blurs", i.e. loses focus), saves.
//     Escape cancels and keeps the old name.
//   - finish() does the saving: .trim() removes extra spaces; an empty name is ignored
//     (the old name stays). If the name really changed, it's stored in the skills array
//     and saved. Then the text box is swapped back for the clickable name, and the grip
//     and ✗ get their screen-reader labels updated to the new name.
//   - "finished" makes sure finish() only runs once. Pressing Enter removes the text box,
//     which also counts as a blur, so without this check it would run twice.
//   - After Enter or Escape, focus goes back to the name, so keyboard users keep their place.
//     After clicking away, focus is left wherever the person clicked.
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

// FILTERING: which level of skills to show. "all" shows every skill; "learning",
// "practicing", or "confident" shows only skills at that level. It's changed by the filter
// buttons above the list (see setUpFilters below) and starts as "all".
// It uses "let" instead of "const" because its value changes.
let activeFilter = "all";

// Draws the skills list from the skills array at the top of this file, showing only the
// skills that match the active filter.
//   1. shownSkills = the skills to show. filter() goes through the array and keeps only the
//      skills whose level matches the active filter (or every skill, for "all"). It builds a
//      NEW list: the skills array itself is never changed by filtering, so hidden skills
//      aren't lost, and clicking "All" shows them again.
//   2. The heading's count is updated to "shown/total": shownSkills.length is how many match,
//      skills.length is how many there are in all, e.g. "(2/5)".
//   3. list.dataset.filter records the active filter on the list, so styles.css can show
//      a fitting message when a filter matches nothing.
//   4. replaceChildren() with nothing inside empties the list, removing every old card.
//   5. forEach goes through the shown skills one at a time. For each one it builds a card:
//        - an <li> with data-index (the skill's position in the FULL skills array, found
//          with indexOf, so deleting, editing, and reordering change the right skill even
//          while a filter is on) and data-level (its level), which styles.css uses to
//          style the level badge;
//        - the skill's clickable, editable name (made by makeSkillName above);
//        - a small badge showing its level, in a <span class="skill-level">;
//        - a grip handle and a red ✗ delete button.
//   6. Each finished card is added to the end of the list with append().
// Clicking ✗ removes that skill from the array with splice(position, 1) ("remove 1 item
// at this position"), saves the array, redraws the list (which also updates the count),
// and puts the cursor back in the New skill box.
function renderSkills() {
  const list = document.getElementById("skill-list");
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

// After a skill card is dragged or moved with the keyboard, the cards on the page are in a
// new order, but the skills array is still in the old one. This puts the array in the same
// order as the cards. It has to work while a filter is on, when only SOME skills are shown:
// the hidden skills must stay exactly where they are, and only the shown ones swap places.
//   - movedSkills = the shown skills in their new on-screen order. Each card remembers its
//     skill's position in the array in data-index, so skills[card.dataset.index] finds it.
//   - spots = the positions in the array those shown skills were using, sorted from
//     first to last (sort((a, b) => a - b) sorts numbers smallest first).
//   - Then the shown skills are put back into those same spots, in their new order. So
//     with every skill shown, this simply reorders the whole array; with a filter on, the
//     hidden skills in between are never touched.
//   - Each card's data-index is updated to its skill's new position, and the order is saved.
// The cards themselves aren't redrawn, so a keyboard user's focus stays on the grip.
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

// Connects the four filter buttons. When one is clicked:
//   - activeFilter becomes that button's data-filter ("all", "learning", and so on);
//   - every button's aria-pressed is updated: "true" for the clicked one, "false" for the
//     rest, which also moves the highlight (styles.css colors the pressed button);
//   - renderSkills() redraws the list with only the matching skills, and updates the count.
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
// ----- END OF SKILLS -----


// ----- PROJECTS -----

// Gives a project card its grip handle and its red ✗, which removes the card.
// Projects aren't stored in an array like skills, so moving one needs no extra step:
// the empty function () => {} means "nothing more to do."
function addProjectControls(item, name) {
  addDragHandle(item, name, () => {});
  addDeleteButton(item, name, () => {
    item.remove();
    document.getElementById("project-name").focus();
  });
}

// Builds a project card: an <li> holding the name in bold (<strong>) and the description
// in a paragraph (<p>) underneath, plus its controls, then adds it to the projects list.
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
// ----- END OF PROJECTS -----


// ----- THE TWO "ADD" FORMS -----
// When either form is submitted (its Add button, or Enter in a box):
//   - event.preventDefault() stops the browser's normal behavior (reloading the page);
//   - .trim() removes spaces from the start and end, so a box with only spaces adds nothing;
//   - the new item is added, then form.reset() clears the form, updateCounts() sets the
//     character counters back to 0, and the cursor goes back to the first box.
// The boxes' "required" setting stops a form being submitted while a box is empty.
//
// SKILLS FORM: push() adds the new { name, level } object to the end of the skills array,
// saveSkills() saves it, then renderSkills() redraws the whole list from the array,
// including the new skill.
// ("{ name, level }" is a shortcut for "{ name: name, level: level }".)
//
// PROJECTS FORM: works the same way, and this also gives the project already written in
// index.html its grip handle and red ✗.
function setUpForms() {
  const skillForm = document.getElementById("skill-form");
  skillForm.addEventListener("submit", (event) => {
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
// ----- END OF THE TWO "ADD" FORMS -----
// ===== END OF SKILLS AND PROJECTS =====


// ===== ONCE THE PAGE HAS LOADED =====
// The switch and the clocks don't exist yet while the <head> is being read, so this waits
// for "DOMContentLoaded", which the browser fires once all the HTML has been read. Then:
//   1. applyTheme again, so the switch's knob matches the theme already applied above.
//   2. Clicking the switch flips to the opposite theme, applies it, and saves the choice.
//   3. The clocks are created and filled in right away, then setInterval reruns
//      updateClocks every 1000 milliseconds (1 second) while the page is open. The clocks
//      only show minutes, but checking every second means the minute changes within a
//      second of the real clock.
//   4. Sections: setUpSections() makes every section's heading slide its box open and
//      closed. Clicking a nav link:
//        - event.preventDefault() stops the browser jumping to the section right away
//          (too early, while it's still closed);
//        - history.pushState() still updates the address bar to end in the section's name
//          (like .../#skills), just as a normal link would, without jumping;
//        - goToSection() shifts the page so the section is at the top, then slides it open.
//      If the page was opened with a link that already ends in a section name (like
//      .../#contact), the same thing happens straight away.
//   5. Character counts: the "input" event fires on every keystroke, paste, or delete in
//      any box on the page, so all the counters update live. The contact form's "reset"
//      event fires when its Reset button is clicked; setTimeout(..., 0) waits until the
//      boxes have actually been cleared, then sets the counters back to 0.
//   6. loadSavedSkills() swaps in the visitor's saved skills (if they have any), then
//      renderSkills() draws the skill cards from the skills array, setUpFilters()
//      connects the filter buttons, and setUpForms() connects the Skills Manager and the
//      Add a project form (and gives the project already on the page its grip handle and red X).
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
    link.addEventListener("click", (event) => {
      event.preventDefault();
      history.pushState(null, "", link.hash);
      goToSection(link.hash);
    });
  });
  setUpSections();
  goToSection(location.hash);

  document.addEventListener("input", updateCounts);
  document.querySelector("#contact form").addEventListener("reset", () => setTimeout(updateCounts, 0));

  loadSavedSkills();
  renderSkills();
  setUpFilters();
  setUpForms();
});
// ===== END OF ONCE THE PAGE HAS LOADED =====
