var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// __tests__/todo-completion.test.ts
var import_node_test = __toESM(require("node:test"));
var import_strict = __toESM(require("node:assert/strict"));

// src/todo-completion.ts
function deriveCardCheckedState(tasks, completedAt) {
  if (completedAt) return true;
  if (tasks.length === 0) return false;
  return tasks.every((task) => task.checked);
}
function getTodoCheckDelta(previousChecked, nextChecked, completedAt, today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
  if (!previousChecked && nextChecked) return 1;
  if (previousChecked && !nextChecked && completedAt === today) return -1;
  return 0;
}

// __tests__/todo-completion.test.ts
(0, import_node_test.default)("deriveCardCheckedState treats completedAt as persisted completion for cards without subtasks", () => {
  import_strict.default.equal(deriveCardCheckedState([], "2026-06-01"), true);
  import_strict.default.equal(deriveCardCheckedState([], ""), false);
  import_strict.default.equal(
    deriveCardCheckedState(
      [
        { text: "a", checked: true },
        { text: "b", checked: true }
      ],
      ""
    ),
    true
  );
  import_strict.default.equal(
    deriveCardCheckedState(
      [
        { text: "a", checked: true },
        { text: "b", checked: false }
      ],
      ""
    ),
    false
  );
});
(0, import_node_test.default)("getTodoCheckDelta increments on check and reverses only for same-day uncheck", () => {
  import_strict.default.equal(getTodoCheckDelta(false, true, ""), 1);
  import_strict.default.equal(getTodoCheckDelta(true, false, "2026-06-01", "2026-06-01"), -1);
  import_strict.default.equal(getTodoCheckDelta(true, false, "2026-05-31", "2026-06-01"), 0);
  import_strict.default.equal(getTodoCheckDelta(true, true, "2026-06-01", "2026-06-01"), 0);
});
