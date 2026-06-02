export function getMsUntilNextMidnight(now: Date = new Date(), bufferMs: number = 5000): number {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - now.getTime() + bufferMs);
}
