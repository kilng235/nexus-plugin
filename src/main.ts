import { App, Plugin } from "obsidian";
import { NexusView, VIEW_TYPE_NEXUS } from "./view";
import { DEFAULT_SETTINGS, NexusSettings } from "./types";

export default class NexusPlugin extends Plugin {
  settings: NexusSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_NEXUS,
      (leaf) => new NexusView(leaf, this.settings)
    );

    this.addRibbonIcon("layout-dashboard", "Open Nexus", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-nexus",
      name: "Open Nexus Dashboard",
      callback: () => this.activateView(),
    });
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_NEXUS)[0];

    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_NEXUS, active: true });
    }

    workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
