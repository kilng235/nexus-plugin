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

// __tests__/epub-reader-state.test.ts
var import_node_test = __toESM(require("node:test"));
var import_strict = __toESM(require("node:assert/strict"));

// src/epub-reader-state.ts
function getEpubFilePathFromState(state) {
  if (!state || typeof state !== "object") return null;
  const filePath = state.filePath;
  if (typeof filePath !== "string") return null;
  const trimmed = filePath.trim();
  return trimmed ? trimmed : null;
}
function getEpubReaderErrorMessage(filePath) {
  if (!filePath) return "\u672A\u6536\u5230 EPUB \u6587\u4EF6\u8DEF\u5F84";
  return `\u672A\u627E\u5230 EPUB \u6587\u4EF6\uFF1A${filePath}`;
}
function shouldDeferEpubOpenError(filePath, stateReady) {
  return !filePath && stateReady;
}

// __tests__/epub-reader-state.test.ts
(0, import_node_test.default)("getEpubFilePathFromState returns filePath when state contains a valid string", () => {
  import_strict.default.equal(getEpubFilePathFromState({ filePath: "books/demo.epub" }), "books/demo.epub");
});
(0, import_node_test.default)("getEpubFilePathFromState returns null for missing or invalid filePath", () => {
  import_strict.default.equal(getEpubFilePathFromState(void 0), null);
  import_strict.default.equal(getEpubFilePathFromState({}), null);
  import_strict.default.equal(getEpubFilePathFromState({ filePath: 123 }), null);
  import_strict.default.equal(getEpubFilePathFromState({ filePath: "" }), null);
});
(0, import_node_test.default)("getEpubReaderErrorMessage distinguishes missing state from missing file", () => {
  import_strict.default.equal(getEpubReaderErrorMessage(null), "\u672A\u6536\u5230 EPUB \u6587\u4EF6\u8DEF\u5F84");
  import_strict.default.equal(getEpubReaderErrorMessage("books/missing.epub"), "\u672A\u627E\u5230 EPUB \u6587\u4EF6\uFF1Abooks/missing.epub");
});
(0, import_node_test.default)("shouldDeferEpubOpenError avoids premature missing-path errors before state arrives", () => {
  import_strict.default.equal(shouldDeferEpubOpenError(null, true), true);
  import_strict.default.equal(shouldDeferEpubOpenError(null, false), false);
  import_strict.default.equal(shouldDeferEpubOpenError("books/demo.epub", true), false);
});
