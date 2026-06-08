import { App } from "obsidian";
import { HubstackSettings, DEFAULT_SETTINGS } from "./types";

const CONFIG_DIR = "hubstack";
const LEGACY_CONFIG_DIR = "nexus";
const CONFIG_PATH = `${CONFIG_DIR}/config.json`;
const LEGACY_CONFIG_PATH = `${LEGACY_CONFIG_DIR}/config.json`;

export async function loadExternalConfig(app: App): Promise<Partial<HubstackSettings>> {
  try {
    const configPath = await resolveExistingPath(app, CONFIG_PATH, LEGACY_CONFIG_PATH);
    if (!configPath) return {};
    const content = await app.vault.adapter.read(configPath);
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function saveExternalConfig(app: App, settings: HubstackSettings): Promise<void> {
  try {
    const dirExists = await app.vault.adapter.exists(CONFIG_DIR);
    if (!dirExists) {
      await app.vault.createFolder(CONFIG_DIR);
    }
    await app.vault.adapter.write(CONFIG_PATH, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error("Failed to save external config:", e);
  }
}

export function mergeSettings(external: Partial<HubstackSettings>, local: Partial<HubstackSettings>): HubstackSettings {
  const merged = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof HubstackSettings>) {
    if (local[key] !== undefined) {
      (merged as any)[key] = local[key];
    }
  }

  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof HubstackSettings>) {
    if (external[key] !== undefined) {
      (merged as any)[key] = external[key];
    }
  }

  if (local.heatmapWeights) {
    merged.heatmapWeights = { ...DEFAULT_SETTINGS.heatmapWeights, ...local.heatmapWeights };
  }
  if (external.heatmapWeights) {
    merged.heatmapWeights = { ...merged.heatmapWeights, ...external.heatmapWeights };
  }

  return merged;
}

async function resolveExistingPath(app: App, primaryPath: string, legacyPath: string): Promise<string | null> {
  if (await app.vault.adapter.exists(primaryPath)) return primaryPath;
  if (await app.vault.adapter.exists(legacyPath)) return legacyPath;
  return null;
}
