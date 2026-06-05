import { join } from "path";
import { homedir } from "os";
import { mkdir } from "node:fs/promises";

const SETTINGS_DIR  = join(homedir(), ".termicards");
const SETTINGS_PATH = join(SETTINGS_DIR, "settings.json");

export interface Settings {
  animationSpeed:      "slow" | "normal" | "fast";
  highlightValidPlays: boolean;
  autoSaveOnQuit:      boolean;
}

export const SPEED_MULTIPLIER: Record<Settings["animationSpeed"], number> = {
  slow:   2.0,
  normal: 1.0,
  fast:   0.4,
};

const DEFAULTS: Settings = {
  animationSpeed:      "normal",
  highlightValidPlays: true,
  autoSaveOnQuit:      false,
};

export async function readSettings(): Promise<Settings> {
  const file = Bun.file(SETTINGS_PATH);
  if (!(await file.exists())) return structuredClone(DEFAULTS);
  try {
    const p = await file.json() as Partial<Settings>;
    return {
      animationSpeed:      (["slow", "normal", "fast"] as const).includes(p.animationSpeed as "slow") ? p.animationSpeed! : DEFAULTS.animationSpeed,
      highlightValidPlays: typeof p.highlightValidPlays === "boolean" ? p.highlightValidPlays : DEFAULTS.highlightValidPlays,
      autoSaveOnQuit:      typeof p.autoSaveOnQuit      === "boolean" ? p.autoSaveOnQuit      : DEFAULTS.autoSaveOnQuit,
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export async function writeSettings(settings: Settings): Promise<void> {
  await mkdir(SETTINGS_DIR, { recursive: true });
  await Bun.write(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}
