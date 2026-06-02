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

// __tests__/heatmap-score.test.ts
var import_node_test = __toESM(require("node:test"));
var import_strict = __toESM(require("node:assert/strict"));

// src/heatmap-score.ts
function scoreToHeatmapLevel(score) {
  if (score <= 0) return 0;
  if (score <= 2) return 1;
  if (score <= 5) return 2;
  if (score <= 9) return 3;
  return 4;
}
function buildDailyScores(settings, activityLog) {
  const scores = {};
  const w = settings.heatmapWeights;
  for (const [dateKey, sessions] of Object.entries(settings.readingSessions)) {
    const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
    const points = Math.floor(totalMs / (10 * 60 * 1e3)) * w.reading10min;
    scores[dateKey] = (scores[dateKey] || 0) + points;
  }
  for (const [dateKey, activity] of Object.entries(activityLog || {})) {
    const points = (activity.cardComplete || 0) * w.cardComplete + (activity.cardCreate || 0) * w.cardCreate + (activity.noteEdit || 0) * (w.noteEdit || 0) + (activity.noteCreate || 0) * (w.noteCreate || 0);
    scores[dateKey] = (scores[dateKey] || 0) + points;
  }
  return scores;
}

// src/types.ts
var DEFAULT_SETTINGS = {
  kanbanFile: "nexus/nexus-kanban",
  bannerImage: "",
  bannerQuote: "Your daily command center",
  bannerPosition: { x: 50, y: 50 },
  bannerHeight: 120,
  bannerZoom: 100,
  gridLayout: [
    { id: "sidebar", x: 0, y: 0, w: 1, h: 2 },
    { id: "todo", x: 1, y: 0, w: 1, h: 1 },
    { id: "heatmap", x: 2, y: 0, w: 1, h: 1 },
    { id: "bookshelf", x: 1, y: 1, w: 2, h: 1 }
  ],
  heatmapWeights: {
    cardComplete: 10,
    reading10min: 3,
    cardCreate: 2,
    noteEdit: 1,
    noteCreate: 3
  },
  readingStats: {},
  readingSessions: {},
  language: "zh",
  stylePreset: "aurora",
  quickLinks: [
    { name: "GitHub", url: "https://github.com", icon: "\u{1F517}" }
  ],
  deepseekApiKey: ""
};

// __tests__/heatmap-score.test.ts
(0, import_node_test.default)("score 5 maps to level 2 instead of darkest level", () => {
  import_strict.default.equal(scoreToHeatmapLevel(0), 0);
  import_strict.default.equal(scoreToHeatmapLevel(1), 1);
  import_strict.default.equal(scoreToHeatmapLevel(2), 1);
  import_strict.default.equal(scoreToHeatmapLevel(3), 2);
  import_strict.default.equal(scoreToHeatmapLevel(5), 2);
  import_strict.default.equal(scoreToHeatmapLevel(6), 3);
  import_strict.default.equal(scoreToHeatmapLevel(10), 4);
});
(0, import_node_test.default)("buildDailyScores keeps current weighted scoring semantics", () => {
  const scores = buildDailyScores(
    DEFAULT_SETTINGS,
    {
      "2026-06-01": {
        cardComplete: 0,
        todoCheck: 0,
        cardCreate: 1,
        noteEdit: 1,
        noteCreate: 1
      }
    }
  );
  import_strict.default.equal(scores["2026-06-01"], 6);
});
