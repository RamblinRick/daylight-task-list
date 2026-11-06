export const STORAGE_KEY = "daylight.tasks.v1";

export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validDate(value) {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}

export function parseTasks(raw) {
  if (raw === null) return [];
  const tasks = JSON.parse(raw);
  if (!Array.isArray(tasks) || !tasks.every(task =>
    task !== null && typeof task === "object" &&
    typeof task.id === "string" && task.id.length > 0 &&
    typeof task.title === "string" && task.title.trim().length > 0 && task.title.length <= 200 &&
    typeof task.completed === "boolean" &&
    typeof task.due === "string" && validDate(task.due) &&
    ["normal", "high", "low"].includes(task.priority)
  ) || new Set(tasks.map(task => task.id)).size !== tasks.length) {
    throw new Error("The saved task data is invalid.");
  }
  return tasks;
}

export function filterTasks(tasks, { view = "all", filter = "all", search = "", today = localDate() } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return tasks.filter(task =>
    (view !== "today" || task.due === today) &&
    (view !== "completed" || task.completed) &&
    (filter !== "active" || !task.completed) &&
    (filter !== "completed" || task.completed) &&
    task.title.toLocaleLowerCase().includes(query)
  );
}
