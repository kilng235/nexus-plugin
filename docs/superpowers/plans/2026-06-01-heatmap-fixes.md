# Nexus Heatmap Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make activity backfill idempotent and switch heatmap color intensity from month-relative scaling to fixed score thresholds so low scores like 5 no longer render as the darkest level.

**Architecture:** Extract the bug-prone logic into two pure helper modules so the behavior can be regression-tested outside Obsidian. Keep the plugin’s public behavior and data shape unchanged: `main.ts` will still backfill from vault metadata, and `heatmap.ts` will still compute totals from existing weights, but both will delegate to small deterministic helpers.

**Tech Stack:** TypeScript, Obsidian plugin runtime, esbuild, Node built-in test runner (`node --test`) with esbuild-bundled test files.

---

## File structure

- Create: `__tests__/activity-backfill.test.ts` — regression tests for idempotent note-create backfill behavior.
- Create: `__tests__/heatmap-score.test.ts` — regression tests for fixed score-to-color-level mapping and daily score aggregation.
- Create: `src/activity-backfill.ts` — pure helper(s) for merging vault backfill counts into `ActivityLog` without repeated accumulation.
- Create: `src/heatmap-score.ts` — pure helper(s) for building daily scores and mapping scores to fixed heatmap levels.
- Modify: `src/main.ts` — replace inline `noteCreate += count` logic with the pure idempotent helper.
- Modify: `src/modules/heatmap.ts` — replace month-relative level calculation with fixed-threshold helper.

### Task 1: Add failing regression test for idempotent activity backfill

**Files:**
- Create: `__tests__/activity-backfill.test.ts`
- Create: `src/activity-backfill.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd /e/1/Juno/nexus-plugin && mkdir -p .tmp-tests && npx esbuild __tests__/activity-backfill.test.ts --bundle --platform=node --format=cjs --outfile=.tmp-tests/activity-backfill.test.cjs && node --test .tmp-tests/activity-backfill.test.cjs
```

Expected: FAIL because `../src/activity-backfill` does not exist yet.

- [ ] **Step 3: Write the minimal implementation helper**

Create `src/activity-backfill.ts`:

```ts
import { ActivityLog } from "./activity-log";

function emptyDay() {
  return { cardComplete: 0, todoCheck: 0, cardCreate: 0, noteEdit: 0, noteCreate: 0 };
}

export function applyActivityBackfill(
  log: ActivityLog,
  editCounts: Record<string, number>,
  createCounts: Record<string, number>
): ActivityLog {
  const next: ActivityLog = {};

  for (const [dateKey, day] of Object.entries(log)) {
    next[dateKey] = { ...day };
  }

  for (const [dateKey, count] of Object.entries(editCounts)) {
    next[dateKey] = { ...(next[dateKey] || emptyDay()) };
    if (!log[dateKey]) {
      next[dateKey].noteEdit = count;
    }
  }

  for (const [dateKey, count] of Object.entries(createCounts)) {
    next[dateKey] = { ...(next[dateKey] || emptyDay()) };
    next[dateKey].noteCreate = count;
  }

  return next;
}
```

- [ ] **Step 4: Wire `main.ts` to use the helper**

Update `src/main.ts` imports:

```ts
import { applyActivityBackfill } from "./activity-backfill";
```

Replace the mutation block inside `backfillActivityFromVault()` with:

```ts
const nextLog = applyActivityBackfill(log, editCounts, createCounts);
const changed = JSON.stringify(nextLog) !== JSON.stringify(log);

if (changed) {
  await saveActivityLog(this.app, nextLog);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
cd /e/1/Juno/nexus-plugin && npx esbuild __tests__/activity-backfill.test.ts --bundle --platform=node --format=cjs --outfile=.tmp-tests/activity-backfill.test.cjs && node --test .tmp-tests/activity-backfill.test.cjs
```

Expected: PASS with `1 test` passed.

- [ ] **Step 6: Build the plugin**

Run:
```bash
cd /e/1/Juno/nexus-plugin && npm run build
```

Expected: esbuild completes without TypeScript or bundling errors.

- [ ] **Step 7: Commit**

```bash
git -C /e/1/Juno/nexus-plugin add __tests__/activity-backfill.test.ts src/activity-backfill.ts src/main.ts && git -C /e/1/Juno/nexus-plugin commit -m "fix: make activity backfill idempotent"
```

### Task 2: Add failing regression test for fixed heatmap color thresholds

**Files:**
- Create: `__tests__/heatmap-score.test.ts`
- Create: `src/heatmap-score.ts`
- Modify: `src/modules/heatmap.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd /e/1/Juno/nexus-plugin && npx esbuild __tests__/heatmap-score.test.ts --bundle --platform=node --format=cjs --outfile=.tmp-tests/heatmap-score.test.cjs && node --test .tmp-tests/heatmap-score.test.cjs
```

Expected: FAIL because `../src/heatmap-score` does not exist yet.

- [ ] **Step 3: Write the minimal score helper**

Create `src/heatmap-score.ts`:

```ts
import { ActivityLog } from "./activity-log";
import { NexusSettings } from "./types";

export function scoreToHeatmapLevel(score: number): number {
  if (score <= 0) return 0;
  if (score <= 2) return 1;
  if (score <= 5) return 2;
  if (score <= 9) return 3;
  return 4;
}

export function buildDailyScores(settings: NexusSettings, activityLog?: ActivityLog): Record<string, number> {
  const scores: Record<string, number> = {};
  const w = settings.heatmapWeights;

  for (const [dateKey, sessions] of Object.entries(settings.readingSessions)) {
    const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
    const points = Math.floor(totalMs / (10 * 60 * 1000)) * w.reading10min;
    scores[dateKey] = (scores[dateKey] || 0) + points;
  }

  for (const [dateKey, activity] of Object.entries(activityLog || {})) {
    const points =
      (activity.cardComplete || 0) * w.cardComplete +
      (activity.cardCreate || 0) * w.cardCreate +
      (activity.noteEdit || 0) * (w.noteEdit || 0) +
      (activity.noteCreate || 0) * (w.noteCreate || 0);
    scores[dateKey] = (scores[dateKey] || 0) + points;
  }

  return scores;
}
```

- [ ] **Step 4: Wire `src/modules/heatmap.ts` to the helper**

Add imports:

```ts
import { buildDailyScores, scoreToHeatmapLevel } from "../heatmap-score";
```

Replace the relative scaling block inside `render()`:

```ts
const maxScore = Math.max(1, ...getMonthScores(scores, viewYear, viewMonth));
...
const level = score === 0 ? 0 : Math.min(4, Math.ceil((score / maxScore) * 4));
```

with:

```ts
const totalPoints = getMonthScores(scores, viewYear, viewMonth).reduce((a, b) => a + b, 0);
...
const level = scoreToHeatmapLevel(score);
```

Also delete the now-unused `maxScore` variable.

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
cd /e/1/Juno/nexus-plugin && npx esbuild __tests__/heatmap-score.test.ts --bundle --platform=node --format=cjs --outfile=.tmp-tests/heatmap-score.test.cjs && node --test .tmp-tests/heatmap-score.test.cjs
```

Expected: PASS with `2 tests` passed.

- [ ] **Step 6: Build the plugin**

Run:
```bash
cd /e/1/Juno/nexus-plugin && npm run build
```

Expected: esbuild completes without bundling errors.

- [ ] **Step 7: Commit**

```bash
git -C /e/1/Juno/nexus-plugin add __tests__/heatmap-score.test.ts src/heatmap-score.ts src/modules/heatmap.ts && git -C /e/1/Juno/nexus-plugin commit -m "fix: use fixed heatmap color thresholds"
```

### Task 3: Final verification in one pass

**Files:**
- Modify: none
- Test: `__tests__/activity-backfill.test.ts`
- Test: `__tests__/heatmap-score.test.ts`

- [ ] **Step 1: Run both regression tests together**

Run:
```bash
cd /e/1/Juno/nexus-plugin && npx esbuild __tests__/activity-backfill.test.ts --bundle --platform=node --format=cjs --outfile=.tmp-tests/activity-backfill.test.cjs && npx esbuild __tests__/heatmap-score.test.ts --bundle --platform=node --format=cjs --outfile=.tmp-tests/heatmap-score.test.cjs && node --test .tmp-tests/activity-backfill.test.cjs .tmp-tests/heatmap-score.test.cjs
```

Expected: PASS with all tests green.

- [ ] **Step 2: Run the production build again**

Run:
```bash
cd /e/1/Juno/nexus-plugin && npm run build
```

Expected: build succeeds and updates `main.js`.

- [ ] **Step 3: Manual verification in Obsidian**

Check these behaviors in the plugin:

```text
1. Open Nexus twice (or reload the plugin twice) without creating new notes.
2. Confirm the same day’s noteCreate count in nexus/activity-log.json does not increase on each load.
3. Open Heatmap for a month where the highest score is 5.
4. Confirm the 5-point day uses level 2 styling, not level 4.
5. Hover the cell and confirm the tooltip still shows the original score number.
```

- [ ] **Step 4: Commit final verification artifacts**

```bash
git -C /e/1/Juno/nexus-plugin status --short
```

Expected: no unexpected files other than intentional source, tests, and bundled `main.js` changes.
