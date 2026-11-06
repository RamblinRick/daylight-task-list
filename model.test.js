import test from "node:test";
import assert from "node:assert/strict";
import { parseTasks, filterTasks, localDate, validDate } from "./model.js";

const tasks = [
  { id: "1", title: "Plan the week", due: "2026-11-06", priority: "high", completed: false },
  { id: "2", title: "Read a book", due: "", priority: "normal", completed: true },
  { id: "3", title: "Buy groceries", due: "2026-11-07", priority: "low", completed: false }
];

test("saved tasks round-trip and missing storage is empty", () => {
  assert.deepEqual(parseTasks(JSON.stringify(tasks)), tasks);
  assert.deepEqual(parseTasks(null), []);
});
test("malformed storage and duplicate IDs are rejected", () => {
  for (const raw of ["{", "null", "{}", "[null]", JSON.stringify([{ ...tasks[0], completed: "yes" }]), JSON.stringify([tasks[0], tasks[0]]), JSON.stringify([{ ...tasks[0], due: "2026-02-30" }])]) {
    assert.throws(() => parseTasks(raw));
  }
});
test("filters support views, completion, and case-insensitive search together", () => {
  assert.deepEqual(filterTasks(tasks, { view: "today", today: "2026-11-06" }), [tasks[0]]);
  assert.deepEqual(filterTasks(tasks, { view: "completed" }), [tasks[1]]);
  assert.deepEqual(filterTasks(tasks, { filter: "active" }), [tasks[0], tasks[2]]);
  assert.deepEqual(filterTasks(tasks, { filter: "completed", search: " BOOK " }), [tasks[1]]);
  assert.deepEqual(filterTasks(tasks, { view: "today", today: "2026-11-06", filter: "completed" }), []);
});
test("dates use local calendar days and reject impossible dates", () => {
  assert.equal(localDate(new Date(2026, 10, 6, 23, 59)), "2026-11-06");
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2026-13-01"), false);
  assert.equal(validDate(""), true);
});
