import { App } from "obsidian";
import { KanbanData, KanbanCard } from "./types";
import { appendToArchive } from "./archive";
import { todayStr } from "./utils";

/**
 * Archive completed cards from previous days to monthly archive files.
 * Modifies data in-place, returns true if any cards were archived.
 */
export async function archiveCompletedCards(app: App, data: KanbanData): Promise<boolean> {
  const today = todayStr();
  let archived = false;

  for (const col of data.columns) {
    const toArchive: Array<{ card: KanbanCard; colName: string }> = [];

    for (const card of col.cards) {
      if (card.checked && card.completedAt && card.completedAt !== today) {
        toArchive.push({ card, colName: col.name });
      }
    }

    for (const { card, colName } of toArchive) {
      const ok = await appendToArchive(app, card, colName);
      if (ok) {
        col.cards = col.cards.filter((c) => c.id !== card.id);
        archived = true;
      }
    }
  }

  return archived;
}

/**
 * Schedule a check shortly after local midnight to archive completed
 * cards from the previous day, even if Obsidian stays open.
 */
export class MidnightScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;

  schedule(onFire: () => Promise<void>): void {
    this.cancel();
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const bufferMs = 5000;
    const msUntilMidnight = midnight.getTime() - now.getTime() + bufferMs;
    this.timer = setTimeout(async () => {
      this.timer = null;
      await onFire();
    }, msUntilMidnight);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
