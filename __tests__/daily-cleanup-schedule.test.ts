import test from "node:test";
import assert from "node:assert/strict";
import { getMsUntilNextMidnight } from "../src/daily-cleanup-schedule.ts";

test("getMsUntilNextMidnight returns milliseconds until next local midnight plus buffer", () => {
  const now = new Date(2026, 5, 2, 23, 59, 0, 0);
  assert.equal(getMsUntilNextMidnight(now, 5000), 65000);
});

test("getMsUntilNextMidnight rolls to the following day when already past midnight", () => {
  const now = new Date(2026, 5, 2, 0, 0, 0, 0);
  assert.equal(getMsUntilNextMidnight(now, 5000), 24 * 60 * 60 * 1000 + 5000);
});
