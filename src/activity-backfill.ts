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
