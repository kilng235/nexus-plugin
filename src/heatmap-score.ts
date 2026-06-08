import { ActivityLog } from "./activity-log";
import { HubstackSettings } from "./types";

export function scoreToHeatmapLevel(score: number): number {
  if (score <= 0) return 0;
  if (score <= 2) return 1;
  if (score <= 5) return 2;
  if (score <= 9) return 3;
  return 4;
}

export function buildDailyScores(settings: HubstackSettings, activityLog?: ActivityLog): Record<string, number> {
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
