import { KanbanData, KanbanColumn, KanbanCard } from "./types";
import { deriveCardCheckedState } from "./todo-completion";

const HASH_FN = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
};

export function generateCardId(title: string, column: string): string {
  const key = `${title}::${column}`;
  return `card-${Math.abs(HASH_FN(key)).toString(36)}`;
}

export function hashContent(s: string): number {
  return HASH_FN(s);
}

export function parseKanbanMarkdown(raw: string): KanbanData {
  const lines = raw.split("\n");
  const columns: KanbanColumn[] = [];

  // Parse frontmatter for column definitions
  let inFrontmatter = false;
  let frontmatterEnd = -1;
  const columnDefs: Record<string, string> = {};
  let lastColumnName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (i === 0 && line === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (line === "---") {
        frontmatterEnd = i;
        break;
      }
      const nameMatch = line.match(/- name:\s*(.+)/);
      if (nameMatch) {
        lastColumnName = nameMatch[1].trim();
        columnDefs[lastColumnName] = "#6366f1";
      }
      const colorMatch = line.match(/color:\s*(.+)/);
      if (colorMatch && lastColumnName) {
        columnDefs[lastColumnName] = colorMatch[1].trim();
      }
    }
  }

  // Parse sections (## headings = columns)
  let currentColumn: KanbanColumn | null = null;
  let currentCard: Partial<KanbanCard> | null = null;
  let currentCardTasks: { text: string; checked: boolean }[] = [];
  let currentCardLines: string[] = [];
  let inBody = false;

  const flushCard = () => {
    if (currentCard && currentColumn && currentCard.title) {
      const card: KanbanCard = {
        id: currentCard.id || generateCardId(currentCard.title, currentColumn.name),
        title: currentCard.title,
        type: currentCard.type || "note",
        body: currentCardLines.join("\n").trim(),
        tags: currentCard.tags || [],
        dueDate: currentCard.dueDate || "",
        checked: deriveCardCheckedState(currentCardTasks, (currentCard as any).completedAt || ""),
        createdAt: currentCard.createdAt || "",
        completedAt: (currentCard as any).completedAt || "",
        tasks: currentCardTasks,
      };
      currentColumn.cards.push(card);
    }
    currentCard = null;
    currentCardTasks = [];
    currentCardLines = [];
    inBody = false;
  };

  for (let i = frontmatterEnd + 1; i < lines.length; i++) {
    const line = lines[i];

    // ## Column heading
    if (line.startsWith("## ")) {
      flushCard();
      const name = line.slice(3).trim();
      currentColumn = { name, color: columnDefs[name] || "#6366f1", cards: [] };
      columns.push(currentColumn);
      continue;
    }

    if (!currentColumn) continue;

    // ### Card heading — only if NOT inside card body
    if (line.startsWith("### ")) {
      if (inBody) {
        currentCardLines.push(line);
      } else {
        flushCard();
        currentCard = {
          title: line.slice(4).trim(),
          type: "note",
          tags: [],
          dueDate: "",
          createdAt: "",
        };
      }
      continue;
    }

    if (!currentCard) continue;

    // Card metadata lines (only before body content starts)
    if (!inBody) {
      const typeMatch = line.match(/^type:\s*(task|note|project)/);
      if (typeMatch) {
        currentCard.type = typeMatch[1] as any;
        continue;
      }
      const dateMatch = line.match(/^date:\s*(.+)/);
      if (dateMatch) {
        currentCard.createdAt = dateMatch[1].trim();
        continue;
      }
      const tagMatch = line.match(/^tags:\s*(.+)/);
      if (tagMatch) {
        currentCard.tags = tagMatch[1].split(",").map((t) => t.trim());
        continue;
      }
      const completedMatch = line.match(/^completed:\s*(.+)/);
      if (completedMatch && currentCard) {
        currentCard.completedAt = completedMatch[1].trim();
        continue;
      }
    }

    // Task items
    const taskMatch = line.match(/^- \[([ xX])\]\s*(.+)$/);
    if (taskMatch) {
      currentCardTasks.push({
        text: taskMatch[2],
        checked: taskMatch[1] !== " ",
      });
      continue;
    }

    // Body lines
    if (line.trim()) {
      inBody = true;
      currentCardLines.push(line);
    }
  }
  flushCard();

  // Fill in missing columns from frontmatter
  for (const name of Object.keys(columnDefs)) {
    if (!columns.find((c) => c.name === name)) {
      columns.push({ name, color: columnDefs[name] || "#6366f1", cards: [] });
    }
  }

  return { columns };
}

export function toKanbanMarkdown(data: KanbanData): string {
  let md = "---\ncolumns:\n";
  for (const col of data.columns) {
    md += `  - name: ${col.name}\n    color: ${col.color}\n`;
  }
  md += "---\n\n";

  for (const col of data.columns) {
    md += `## ${col.name}\n\n`;
    for (const card of col.cards) {
      md += `### ${card.title}\n`;
      md += `type: ${card.type}\n`;
      if (card.createdAt) md += `date: ${card.createdAt}\n`;
      if (card.completedAt) md += `completed: ${card.completedAt}\n`;
      if (card.tags.length) md += `tags: ${card.tags.join(", ")}\n`;
      md += "\n";
      for (const task of card.tasks) {
        md += `- [${task.checked ? "x" : " "}] ${task.text}\n`;
      }
      if (card.body) md += card.body + "\n";
      md += "\n";
    }
  }

  return md;
}
