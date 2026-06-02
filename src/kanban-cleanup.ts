import type { KanbanData } from "./types";

export function pruneCompletedCardsData(
  data: KanbanData,
  today: string = new Date().toISOString().slice(0, 10)
): boolean {
  let pruned = false;

  for (const col of data.columns) {
    const before = col.cards.length;
    col.cards = col.cards.filter((c) => !c.checked || c.completedAt === today);
    if (col.cards.length < before) pruned = true;
  }

  return pruned;
}
