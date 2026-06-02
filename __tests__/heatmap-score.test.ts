import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyScores, scoreToHeatmapLevel } from "../src/heatmap-score";
import { DEFAULT_SETTINGS } from "../src/types";

test("score 5 maps to level 2 instead of darkest level", () => {
  assert.equal(scoreToHeatmapLevel(0), 0);
  assert.equal(scoreToHeatmapLevel(1), 1);
  assert.equal(scoreToHeatmapLevel(2), 1);
  assert.equal(scoreToHeatmapLevel(3), 2);
  assert.equal(scoreToHeatmapLevel(5), 2);
  assert.equal(scoreToHeatmapLevel(6), 3);
  assert.equal(scoreToHeatmapLevel(10), 4);
});

test("buildDailyScores keeps current weighted scoring semantics", () => {
  const scores = buildDailyScores(
    DEFAULT_SETTINGS,
    {
      "2026-06-01": {
        cardComplete: 0,
        todoCheck: 0,
        cardCreate: 1,
        noteEdit: 1,
        noteCreate: 1,
      },
    }
  );

  assert.equal(scores["2026-06-01"], 6);
});
