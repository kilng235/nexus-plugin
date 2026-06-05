import { App, TFile } from "obsidian";
import { KanbanCard } from "./types";

/**
 * Get the monthly archive file path for a given date.
 */
function getArchivePath(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `nexus/archive/${year}-${month}.md`;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Read the content of a vault file by path, or return empty string if missing.
 */
async function readFile(app: App, path: string): Promise<string> {
  const file = app.vault.getFileByPath(path);
  if (!file) return "";
  return await app.vault.read(file);
}

/**
 * Ensure the archive directory exists (nexus/archive/) by creating it through
 * the vault API so Obsidian properly indexes it.
 */
async function ensureArchiveDir(app: App): Promise<void> {
  try {
    const dir = app.vault.getAbstractFileByPath("nexus/archive");
    if (!dir) {
      await app.vault.createFolder("nexus/archive");
    }
  } catch (e) {
    console.error("Nexus: failed to create archive directory", e);
  }
}

/**
 * Append a completed card to the monthly archive file.
 * Uses the vault API (create/modify) so the file is indexed by Obsidian.
 * Uses a card ID marker (HTML comment) for dedup.
 *
 * Archive format:
 * ```markdown
 * # 2026-06 完成事项
 *
 * ## 2026-06-05
 *
 * - [x] 任务标题 — 来自「列名」 <!-- card-id-here -->
 * ```
 *
 * @returns true if the card was newly archived, false if already present.
 */
export async function appendToArchive(
  app: App,
  card: KanbanCard,
  columnName: string
): Promise<boolean> {
  if (!card.completedAt || !card.id) return false;

  await ensureArchiveDir(app);

  const archivePath = getArchivePath(card.completedAt);
  const dateLabel = card.completedAt;
  const cardMarker = `<!-- ${card.id} -->`;

  // Read existing content via vault API
  let content = await readFile(app, archivePath);

  // Dedup: skip if this card ID is already in the archive
  if (content.includes(cardMarker)) return false;

  // Build entry line
  const entryLine = `- [x] ${card.title} — 来自「${columnName}」 ${cardMarker}`;
  const dateSection = `## ${dateLabel}`;

  if (content.includes(dateSection)) {
    // Append entry right after the date heading
    content = content.replace(
      new RegExp(`(${escapeRegex(dateSection)}\\n)`),
      `$1${entryLine}\n`
    );
  } else {
    // New date section at the end
    content += `\n${dateSection}\n\n${entryLine}\n`;
  }

  // Persist via vault API (create if new, modify if existing)
  try {
    const existingFile = app.vault.getFileByPath(archivePath);
    if (existingFile) {
      await app.vault.modify(existingFile, content);
    } else {
      const monthYear = card.completedAt.substring(0, 7);
      const header = `# ${monthYear} 完成事项\n`;
      await app.vault.create(archivePath, header + content);
    }
  } catch (e) {
    console.error("Nexus: failed to write archive entry", e);
    return false;
  }

  return true;
}
