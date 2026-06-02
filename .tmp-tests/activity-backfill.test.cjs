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

// __tests__/activity-backfill.test.ts
var import_node_test = __toESM(require("node:test"));
var import_strict = __toESM(require("node:assert/strict"));

// src/activity-backfill.ts
function emptyDay() {
  return { cardComplete: 0, todoCheck: 0, cardCreate: 0, noteEdit: 0, noteCreate: 0 };
}
function applyActivityBackfill(log, editCounts, createCounts) {
  const next = {};
  for (const [dateKey, day] of Object.entries(log)) {
    next[dateKey] = { ...day };
  }
  for (const [dateKey, count] of Object.entries(editCounts)) {
    next[dateKey] = { ...next[dateKey] || emptyDay() };
    if (!log[dateKey]) {
      next[dateKey].noteEdit = count;
    }
  }
  for (const [dateKey, count] of Object.entries(createCounts)) {
    next[dateKey] = { ...next[dateKey] || emptyDay() };
    next[dateKey].noteCreate = count;
  }
  return next;
}

// __tests__/activity-backfill.test.ts
(0, import_node_test.default)("applyActivityBackfill does not double-count noteCreate on repeated runs", () => {
  const original = {
    "2026-05-31": {
      cardComplete: 0,
      todoCheck: 0,
      cardCreate: 0,
      noteEdit: 2,
      noteCreate: 1
    }
  };
  const first = applyActivityBackfill(original, {}, { "2026-05-31": 3 });
  const second = applyActivityBackfill(first, {}, { "2026-05-31": 3 });
  import_strict.default.equal(first["2026-05-31"].noteCreate, 3);
  import_strict.default.equal(second["2026-05-31"].noteCreate, 3);
  import_strict.default.equal(second["2026-05-31"].noteEdit, 2);
});
