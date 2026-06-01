import { join } from "path";
import { homedir } from "os";
import { mkdir, unlink } from "node:fs/promises";
import { Card, Rank, Suit } from "./entities/card";

const SAVES_DIR = join(homedir(), ".termicards");

export interface SerializedCard {
  rank: string;
  suit: string;
}

export function serializeCards(cards: Card[]): SerializedCard[] {
  return cards.map((c) => ({ rank: c.rank, suit: c.suit }));
}

export function deserializeCards(cards: SerializedCard[]): Card[] {
  return cards.map((c) => new Card(c.rank as Rank, c.suit as Suit));
}

function savePath(key: string): string {
  return join(SAVES_DIR, `${key}.json`);
}

export async function writeSave(key: string, state: unknown): Promise<void> {
  await mkdir(SAVES_DIR, { recursive: true });
  await Bun.write(
    savePath(key),
    JSON.stringify({ savedAt: new Date().toISOString(), state }, null, 2)
  );
}

export async function readSave<T>(
  key: string
): Promise<{ state: T; savedAt: string } | null> {
  const file = Bun.file(savePath(key));
  if (!(await file.exists())) return null;
  return file.json() as Promise<{ state: T; savedAt: string }>;
}

export async function deleteSave(key: string): Promise<void> {
  try {
    await unlink(savePath(key));
  } catch {
    // File didn't exist — nothing to do
  }
}
