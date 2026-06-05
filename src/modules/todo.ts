import { KanbanData, KanbanCard } from "../types";
import { KanbanSync } from "../kanban-sync";
import { InputModal } from "./input-modal";
import { App } from "obsidian";
import { ActivityLog } from "../activity-log";

/**
 * Count this month's completed tasks from archive file.
 */
async function countArchivedThisMonth(app: App, monthKey: string): Promise<number> {
  try {
    const archivePath = `nexus/archive/${monthKey}.md`;
    const file = app.vault.getFileByPath(archivePath);
    if (!file) return 0;
    const content = await app.vault.read(file);
    // Count each "- [x]" line as one completed task
    const matches = content.match(/^- \[x\]/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Count today's completed tasks from kanban data.
 */
function countTodayCompleted(data: KanbanData): number {
  const col = data.columns.find((c) => c.name === "已完成");
  if (!col) return 0;
  return col.cards.filter((c) => c.type === "task" && c.checked).length;
}

export async function renderTodo(
  el: HTMLElement,
  data: KanbanData,
  sync: KanbanSync,
  app: App,
  activityLog: ActivityLog,
  cleanupFns: Array<() => void>
) {
  el.empty();
  el.addClass("nexus-todo");

  const header = el.createDiv({ cls: "nexus-todo-header" });
  const headerMain = header.createDiv({ cls: "nexus-todo-header-main" });
  headerMain.createEl("h3", { text: "待办" });

  // Collect task cards from 待做 and 已完成 columns only
  const relevantColumns = ["待做", "已完成"];
  const taskCards = data.columns
    .filter((col) => relevantColumns.includes(col.name))
    .flatMap((col) =>
      col.cards
        .filter((c) => c.type === "task")
        .map((c) => ({ ...c, columnName: col.name }))
    );

  const pendingCount = taskCards.filter((card) => !card.checked).length;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayCount = countTodayCompleted(data);
  const archivedCount = await countArchivedThisMonth(app, monthKey);
  const completedCount = todayCount + archivedCount;

  const statsEl = headerMain.createDiv({ cls: "nexus-todo-stats" });
  statsEl.createEl("span", {
    cls: "nexus-todo-stat nexus-todo-stat--pending",
    text: `待办 ${pendingCount}`,
  });
  statsEl.createEl("span", {
    cls: "nexus-todo-stat nexus-todo-stat--completed",
    text: `本月完成 ${completedCount}`,
  });

  // Add task button
  const addBtn = header.createEl("button", {
    cls: "nexus-todo-add-btn",
    text: "+ 添加任务",
  });
  addBtn.addEventListener("click", () => {
    new InputModal(app, "新建任务", "输入任务内容", async (title) => {
      const newCard: KanbanCard = {
        id: `card-${Date.now().toString(36)}`,
        title,
        type: "task",
        body: "",
        tags: [],
        dueDate: "",
        checked: false,
        createdAt: new Date().toISOString().slice(0, 10),
        completedAt: "",
        tasks: [],
      };
      // Add to first column (待做)
      await sync.addCard(data.columns[0]?.name || "待做", newCard);
    }).open();
  });

  const listEl = el.createDiv({ cls: "nexus-todo-list" });

  if (taskCards.length === 0) {
    listEl.createDiv({
      cls: "nexus-todo-empty",
      text: "暂无任务。点击上方「添加任务」创建。",
    });
    return;
  }

  for (const card of taskCards) {
    const itemEl = listEl.createDiv({ cls: "nexus-todo-item" });

    const checkbox = itemEl.createEl("input", {
      type: "checkbox",
      cls: "nexus-todo-checkbox",
    }) as HTMLInputElement;
    checkbox.checked = card.checked;
    checkbox.addEventListener("change", async () => {
      await sync.toggleCard(card.id, checkbox.checked);
    });

    const label = itemEl.createEl("span", {
      text: card.title,
      cls: "nexus-todo-label",
    });
    if (card.checked) label.addClass("nexus-todo-label--done");

    // Show column name as context
    itemEl.createEl("span", {
      text: card.columnName,
      cls: "nexus-todo-context",
    });
  }
}
