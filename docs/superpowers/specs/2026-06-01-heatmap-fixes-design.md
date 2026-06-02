# Nexus heatmap fixes design

## Scope
Fix two approved bugs with minimal behavior changes:

1. Activity backfill must not repeatedly accumulate `noteCreate` values on every plugin load.
2. Heatmap color intensity must use absolute score thresholds instead of month-relative scaling, so a score of 5 does not render as the darkest level.

## Root causes

### 1. Repeated `noteCreate` accumulation
`backfillActivityFromVault()` recomputes recent note creation counts on each startup and adds them onto existing log values with `+=`, making the backfill non-idempotent.

### 2. Over-dark heatmap cells for low scores
`renderHeatmap()` computes color level relative to the maximum score in the current month. If 5 is the highest score in that month, it is scaled to level 4, which conflicts with the intended absolute-strength reading.

## Approved approach
Use the smallest safe change set:

1. Make activity backfill idempotent.
   - Keep existing backfill flow.
   - Stop adding `noteCreate` counts repeatedly.
   - Preserve existing activity log structure.
2. Replace relative monthly color scaling with fixed score thresholds.
   - Approved thresholds:
     - 0 -> level 0
     - 1-2 -> level 1
     - 3-5 -> level 2
     - 6-9 -> level 3
     - 10+ -> level 4
   - Keep total score calculation unchanged.

## Implementation outline
1. Add small testable helpers for heatmap score-to-level mapping.
2. Add regression tests for:
   - repeated backfill behavior
   - heatmap level mapping for score 5
3. Update `main.ts` to make `noteCreate` backfill idempotent.
4. Update `heatmap.ts` to use the fixed thresholds.
5. Build and run tests to verify the fix.

## Non-goals
- No redesign of heatmap scoring weights.
- No UI layout changes.
- No migration of historical activity log schema unless required by the minimal fix.
