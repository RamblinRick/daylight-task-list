import { STORAGE_KEY, localDate, validDate, parseTasks, filterTasks } from "./model.js";

const $ = selector => document.querySelector(selector);
let tasks = [];
let view = "all";
let filter = "all";
let editingId = null;
let storageReadable = true;
let currentDay = localDate();
const dialog = $("#task-dialog");
const titleInput = $("#task-title");

function showError(message) {
  $("#storage-error").textContent = message;
  $("#storage-error").hidden = false;
}

try {
  tasks = parseTasks(localStorage.getItem(STORAGE_KEY));
} catch (error) {
  storageReadable = false;
  showError(`Your saved tasks could not be loaded. Existing data will not be overwritten. Changes in this session will not be saved. ${error.message}`);
}

function save() {
  if (!storageReadable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    $("#storage-error").hidden = true;
    $(".storage-note").lastChild.textContent = " Saved on this browser";
  } catch (error) {
    showError(`Your changes are only in memory and will be lost on reload: ${error.message}`);
    $(".storage-note").lastChild.textContent = " Changes not saved";
  }
}
if (!storageReadable) $(".storage-note").lastChild.textContent = " Browser storage unavailable";

function announce(message) {
  $("#announcement").textContent = message;
}

function updateTasks(next, message) {
  tasks = next;
  save();
  render();
  announce(message);
}

function button(text, label, action, className = "") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `icon-button ${className}`;
  element.textContent = text;
  element.setAttribute("aria-label", label);
  element.addEventListener("click", action);
  return element;
}

function renderTask(task) {
  const item = document.createElement("li");
  item.className = `task${task.completed ? " completed" : ""}`;
  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "task-check";
  check.checked = task.completed;
  check.setAttribute("aria-label", `Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`);
  check.addEventListener("change", () => {
    const position = [...$("#task-list").children].indexOf(item);
    updateTasks(tasks.map(entry => entry.id === task.id ? { ...entry, completed: check.checked } : entry), check.checked ? "Task completed." : "Task marked as to do.");
    const remaining = $("#task-list").children;
    const target = remaining[Math.min(position, remaining.length - 1)];
    (target?.querySelector(".task-check") ?? $("#add-task")).focus();
  });
  const main = document.createElement("div");
  main.className = "task-main";
  const name = document.createElement("div");
  name.className = "task-name";
  name.textContent = task.title;
  main.append(name);
  if (task.due) {
    const due = document.createElement("div");
    const overdue = task.due < localDate() && !task.completed;
    due.className = `task-meta${overdue ? " overdue" : ""}`;
    due.textContent = `${overdue ? "Overdue · " : ""}${task.due === localDate() ? "Today" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${task.due}T12:00:00`))}`;
    main.append(due);
  }
  const priority = document.createElement("span");
  priority.className = `priority ${task.priority}`;
  priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)}`;
  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    button("✎", `Edit ${task.title}`, () => openDialog(task)),
    button("×", `Delete ${task.title}`, () => {
      const position = [...$("#task-list").children].indexOf(item);
      updateTasks(tasks.filter(entry => entry.id !== task.id), "Task deleted.");
      const remaining = $("#task-list").children;
      (remaining[Math.min(position, remaining.length - 1)]?.querySelector(".task-check") ?? $("#add-task")).focus();
    }, "delete")
  );
  item.append(check, main, priority, actions);
  return item;
}

function render() {
  const today = localDate();
  const completed = tasks.filter(task => task.completed).length;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  $("#date-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  $("#all-count").textContent = tasks.length;
  $("#today-count").textContent = tasks.filter(task => task.due === today).length;
  $("#completed-count").textContent = completed;
  $("#page-title").textContent = { all: "A little more organized.", today: "One day at a time.", completed: "Look how far you've come." }[view];
  $("#page-subtitle").textContent = { all: "Clear your mind. Make a list. Take it one task at a time.", today: "A little focus on what's on your list for today.", completed: "Every checked box is a small win. These are yours." }[view];
  $("#progress-title").textContent = !tasks.length ? "A fresh start" : completed === tasks.length ? "Everything done. Take a breath." : completed ? "You're making progress." : "Let's make a little progress.";
  $("#progress-description").textContent = !tasks.length ? "Your next small step starts here." : completed === tasks.length ? "Enjoy a well-earned moment for yourself." : "One small step is all it takes to get going.";
  $("#progress-label").textContent = `${completed} of ${tasks.length} completed`;
  $(".progress-track").setAttribute("aria-valuenow", percent);
  $("#progress-fill").style.width = `${percent}%`;
  const visible = filterTasks(tasks, { view, filter, search: $("#search").value, today });
  $("#task-list").replaceChildren(...visible.map(renderTask));
  $("#visible-count").textContent = filterTasks(tasks, { view, search: $("#search").value, today }).length;
  $("#empty-state").hidden = visible.length > 0;
  const firstTask = tasks.length === 0 && view === "all" && filter === "all" && !$("#search").value.trim();
  $("#empty-title").textContent = firstTask ? "A clear list, a clear mind." : $("#search").value.trim() ? "No matching tasks." : view === "completed" || filter === "completed" ? "Small wins are on their way." : "You're all clear here.";
  $("#empty-description").textContent = firstTask ? "Add your first task and make a little room for progress." : $("#search").value.trim() ? "Try a different search or switch your task view." : view === "completed" || filter === "completed" ? "Complete a task and it will appear here." : "Nothing on this list right now. A little breathing room.";
  $("#empty-add").hidden = !firstTask;
  const remaining = tasks.length - completed;
  $("#remaining-label").textContent = tasks.length ? `${remaining} task${remaining === 1 ? "" : "s"} left to do` : "No tasks yet";
  $("#clear-completed").hidden = completed === 0;
}

function openDialog(task = null) {
  editingId = task?.id ?? null;
  $("#task-form").reset();
  titleInput.setCustomValidity("");
  $("#task-date").setCustomValidity("");
  titleInput.value = task?.title ?? "";
  $("#task-date").value = task?.due ?? "";
  $("#task-priority").value = task?.priority ?? "normal";
  $("#dialog-title").textContent = task ? "Make a little adjustment" : "A new small step";
  $("#save-task").textContent = task ? "Save changes" : "Add task";
  dialog.showModal();
  titleInput.focus();
}

$("#add-task").addEventListener("click", () => openDialog());
$("#empty-add").addEventListener("click", () => openDialog());
$("#close-dialog").addEventListener("click", () => dialog.close());
$("#cancel-dialog").addEventListener("click", () => dialog.close());
titleInput.addEventListener("input", () => titleInput.setCustomValidity(""));
$("#task-date").addEventListener("input", event => event.target.setCustomValidity(""));
$("#task-form").addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.setCustomValidity("Please enter a task name.");
    titleInput.reportValidity();
    return;
  }
  const due = $("#task-date").value;
  if (!validDate(due)) {
    $("#task-date").setCustomValidity("Please enter a valid date.");
    $("#task-date").reportValidity();
    return;
  }
  const fields = { title, due, priority: $("#task-priority").value };
  const next = editingId
    ? tasks.map(task => task.id === editingId ? { ...task, ...fields } : task)
    : [...tasks, {
      ...fields,
      id: typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join(""),
      completed: false
    }];
  updateTasks(next, editingId ? "Task updated." : "Task added.");
  dialog.close();
});
document.querySelectorAll("[data-view]").forEach(element => element.addEventListener("click", () => {
  view = element.dataset.view;
  filter = "all";
  document.querySelectorAll("[data-view]").forEach(nav => {
    nav.classList.toggle("selected", nav === element);
    if (nav === element) nav.setAttribute("aria-current", "page");
    else nav.removeAttribute("aria-current");
  });
  updateFilters();
  render();
}));
function updateFilters() {
  document.querySelectorAll("[data-filter]").forEach(element => {
    const active = element.dataset.filter === filter;
    element.classList.toggle("active", active);
    element.setAttribute("aria-pressed", active);
    element.hidden = view === "completed" && element.dataset.filter !== "all";
  });
}
document.querySelectorAll("[data-filter]").forEach(element => element.addEventListener("click", () => {
  filter = element.dataset.filter;
  updateFilters();
  render();
}));
$("#search").addEventListener("input", render);
$("#clear-completed").addEventListener("click", () => {
  updateTasks(tasks.filter(task => !task.completed), "Completed tasks cleared.");
  $("#add-task").focus();
});
window.addEventListener("storage", event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try {
    tasks = parseTasks(localStorage.getItem(STORAGE_KEY));
    storageReadable = true;
    $("#storage-error").hidden = true;
    $(".storage-note").lastChild.textContent = " Saved on this browser";
    render();
  } catch (error) {
    storageReadable = false;
    showError(`Tasks changed in another tab but could not be loaded. Changes will not be saved. ${error.message}`);
    $(".storage-note").lastChild.textContent = " Changes not saved";
  }
});
setInterval(() => {
  if (localDate() !== currentDay) {
    currentDay = localDate();
    render();
  }
}, 60000);
render();
