import { join } from "path";
import { homedir } from "os";
import { mkdir } from "node:fs/promises";

const STATS_DIR  = join(homedir(), ".termicards");
const STATS_PATH = join(STATS_DIR, "stats.json");

export interface GameStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export interface Stats {
  crazy_eights: GameStats;
  spades: GameStats & { highScore: number };
}

const DEFAULTS: Stats = {
  crazy_eights: { wins: 0, losses: 0, gamesPlayed: 0 },
  spades:       { wins: 0, losses: 0, gamesPlayed: 0, highScore: 0 },
};

export async function readStats(): Promise<Stats> {
  const file = Bun.file(STATS_PATH);
  if (!(await file.exists())) return structuredClone(DEFAULTS);
  try {
    return await file.json() as Stats;
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export async function writeStats(stats: Stats): Promise<void> {
  await mkdir(STATS_DIR, { recursive: true });
  await Bun.write(STATS_PATH, JSON.stringify(stats, null, 2));
}

export async function recordResult(
  game: "crazy_eights" | "spades",
  result: "win" | "loss",
  score?: number
): Promise<void> {
  const stats = await readStats();
  stats[game].gamesPlayed++;
  if (result === "win") stats[game].wins++;
  else stats[game].losses++;
  if (game === "spades" && score !== undefined && score > stats.spades.highScore) {
    stats.spades.highScore = score;
  }
  await writeStats(stats);
}
