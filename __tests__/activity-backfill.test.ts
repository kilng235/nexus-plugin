import test from "node:test";
import assert from "node:assert/strict";
import { applyActivityBackfill } from "../src/activity-backfill";

test("applyActivityBackfill does not double-count noteCreate on repeated runs", () => {
  const original = {
    "2026-05-31": {
      cardComplete: 0,
      todoCheck: 0,
      cardCreate: 0,
      noteEdit: 2,
      noteCreate: 1,
    },
  };

  const first = applyActivityBackfill(original, {}, { "2026-05-31": 3 });
  const second = applyActivityBackfill(first, {}, { "2026-05-31": 3 });

  assert.equal(first["2026-05-31"].noteCreate, 3);
  assert.equal(second["2026-05-31"].noteCreate, 3);
  assert.equal(second["2026-05-31"].noteEdit, 2);
});
