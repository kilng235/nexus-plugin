import { App, TFile, ItemView, WorkspaceLeaf } from "obsidian";
import { NexusSettings } from "../types";

export class EpubReaderView extends ItemView {
  private filePath: string;
  private settings: NexusSettings;
  private startTime: number;

  constructor(leaf: WorkspaceLeaf, filePath: string, settings: NexusSettings) {
    super(leaf);
    this.filePath = filePath;
    this.settings = settings;
    this.startTime = Date.now();
  }

  getViewType() { return "epub-reader"; }
  getDisplayText() { return this.filePath.split("/").pop() || "EPUB Reader"; }
  getIcon() { return "book-open"; }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("nexus-epub-reader");

    const file = this.app.vault.getAbstractFileByPath(this.filePath);
    if (!(file instanceof TFile)) {
      container.createDiv({ text: "文件未找到" });
      return;
    }

    const content = await this.app.vault.read(file);
    container.createDiv({ text: `正在打开: ${file.basename}`, cls: "nexus-epub-loading" });

    // Track reading session
    this.startTime = Date.now();
  }

  async onClose() {
    // Save reading session
    const duration = Date.now() - this.startTime;
    const today = new Date().toISOString().slice(0, 10);
    const file = this.app.vault.getAbstractFileByPath(this.filePath);
    const title = file instanceof TFile ? file.basename : "Unknown";

    if (!this.settings.readingSessions[today]) {
      this.settings.readingSessions[today] = [];
    }
    this.settings.readingSessions[today].push({
      filePath: this.filePath,
      title,
      startAt: new Date(this.startTime).toISOString(),
      endAt: new Date().toISOString(),
      durationMs: duration,
    });

    // Update reading stats
    if (!this.settings.readingStats[this.filePath]) {
      this.settings.readingStats[this.filePath] = {
        filePath: this.filePath,
        title,
        totalDurationMs: 0,
        sessionCount: 0,
        lastReadAt: "",
      };
    }
    const stat = this.settings.readingStats[this.filePath];
    stat.totalDurationMs += duration;
    stat.sessionCount++;
    stat.lastReadAt = new Date().toISOString();

    // Save
    this.app.vault.adapter.write(
      this.app.vault.configDir + "/plugins/nexus/data.json",
      JSON.stringify(this.settings, null, 2)
    );
  }
}

export function registerEpubReader(app: App, settings: NexusSettings) {
  // Register epub file opener
  app.workspace.on("file-open", (file) => {
    if (file instanceof TFile && file.extension === "epub") {
      const leaf = app.workspace.getLeaf("tab");
      leaf.setViewState({
        type: "epub-reader",
        state: { file: file.path },
      });
    }
  });
}
