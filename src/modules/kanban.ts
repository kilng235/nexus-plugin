import { App, TFile } from "obsidian";
import { NexusSettings, KanbanColumn, KanbanCard } from "../types";
import { InputModal } from "./input-modal";
import { FilePickerModal } from "./file-picker-modal";

export function renderKanban(el: HTMLElement, settings: NexusSettings, app: App) {
  el.empty();
  el.addClass("nexus-kanban");

  const header = el.createDiv({ cls: "nexus-kanban-header" });
  header.createEl("h3", { text: "📋 看板" });

  const addBtn = header.createEl("button", { text: "+", cls: "nexus-kanban-add" });
  addBtn.addEventListener("click", () => {
    new InputModal(app, "新建卡片", "输入卡片标题...", (title) => {
      addCard(settings, app, title);
    }).open();
  });

  const kanbanFile = app.vault.getAbstractFileByPath(settings.kanbanFile + ".md");
  if (!(kanbanFile instanceof TFile)) {
    el.createDiv({ text: "未找到看板文件", cls: "nexus-kanban-empty" });
    return;
  }

  app.vault.read(kanbanFile).then(content => {
    const columns = parseKanban(content);
    renderColumns(el, columns, settings, app, kanbanFile);
  });
}

function parseKanban(content: string): KanbanColumn[] {
  const columns: KanbanColumn[] = [];
  const lines = content.split("\n");
  let current: KanbanColumn | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) columns.push(current);
      current = { name: line.slice(3).trim(), color: "", cards: [] };
    } else if (current && line.startsWith("- [x] ")) {
      current.cards.push({
        id: Math.random().toString(36).slice(2, 8),
        title: line.slice(6),
        type: "task",
        body: "",
        tags: [],
        dueDate: "",
        checked: true,
        createdAt: "",
        completedAt: "",
        tasks: [],
      });
    } else if (current && line.startsWith("- [ ] ")) {
      current.cards.push({
        id: Math.random().toString(36).slice(2, 8),
        title: line.slice(6),
        type: "task",
        body: "",
        tags: [],
        dueDate: "",
        checked: false,
        createdAt: "",
        completedAt: "",
        tasks: [],
      });
    }
  }
  if (current) columns.push(current);
  return columns;
}

function renderColumns(
  el: HTMLElement,
  columns: KanbanColumn[],
  settings: NexusSettings,
  app: App,
  file: TFile
) {
  const board = el.createDiv({ cls: "nexus-kanban-board" });

  for (const col of columns) {
    const colEl = board.createDiv({ cls: "nexus-kanban-column" });
    const colHeader = colEl.createDiv({ cls: "nexus-kanban-col-header" });
    colHeader.createSpan({ text: col.name, cls: "nexus-kanban-col-title" });
    colHeader.createSpan({ text: `${col.cards.length}`, cls: "nexus-kanban-col-count" });

    const cardsEl = colEl.createDiv({ cls: "nexus-kanban-cards" });
    for (const card of col.cards) {
      const cardEl = cardsEl.createDiv({ cls: `nexus-kanban-card ${card.checked ? "nexus-kanban-card--done" : ""}` });
      const checkbox = cardEl.createEl("input", { type: "checkbox" });
      checkbox.checked = card.checked;
      checkbox.addEventListener("change", () => {
        toggleCard(file, card, app, settings);
      });
      cardEl.createSpan({ text: card.title, cls: "nexus-kanban-card-title" });
    }
  }
}

async function toggleCard(file: TFile, card: KanbanCard, app: App, settings: NexusSettings) {
  const content = await app.vault.read(file);
  const oldLine = card.checked ? `- [x] ${card.title}` : `- [ ] ${card.title}`;
  const newLine = card.checked ? `- [ ] ${card.title}` : `- [x] ${card.title}`;
  const updated = content.replace(oldLine, newLine);
  await app.vault.modify(file, updated);

  // Update activity log
  const today = new Date().toISOString().slice(0, 10);
  if (!settings.activityLog[today]) {
    settings.activityLog[today] = { cardComplete: 0, todoCheck: 0, cardCreate: 0 };
  }
  settings.activityLog[today].cardComplete++;
  app.vault.adapter.write(
    app.vault.configDir + "/plugins/nexus/data.json",
    JSON.stringify(settings, null, 2)
  );
}

async function addCard(settings: NexusSettings, app: App, title: string) {
  const kanbanFile = app.vault.getAbstractFileByPath(settings.kanbanFile + ".md");
  if (!(kanbanFile instanceof TFile)) return;

  const content = await app.vault.read(kanbanFile);
  // Add to first column
  const firstSection = content.indexOf("## ");
  if (firstSection === -1) return;

  const insertPos = content.indexOf("\n", firstSection) + 1;
  const updated = content.slice(0, insertPos) + `- [ ] ${title}\n` + content.slice(insertPos);
  await app.vault.modify(kanbanFile, updated);

  // Update activity log
  const today = new Date().toISOString().slice(0, 10);
  if (!settings.activityLog[today]) {
    settings.activityLog[today] = { cardComplete: 0, todoCheck: 0, cardCreate: 0 };
  }
  settings.activityLog[today].cardCreate++;
  app.vault.adapter.write(
    app.vault.configDir + "/plugins/nexus/data.json",
    JSON.stringify(settings, null, 2)
  );
}
