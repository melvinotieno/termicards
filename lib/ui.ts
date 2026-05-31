import chalk from "chalk";
import { Card, Suit } from "./entities/card";

const GAP = "  ";
const CARD_HEIGHT = 5;
const MAX_BACKS = 9;

export const SUIT_LABELS: Record<Suit, string> = {
  [Suit.SPADES]: "♠ Spades",
  [Suit.HEARTS]: "♥ Hearts",
  [Suit.CLUBS]: "♣ Clubs",
  [Suit.DIAMONDS]: "♦ Diamonds",
};

export function formatCardInline(card: Card): string {
  const s = card.toString();
  return card.getColor() === "red" ? chalk.red(s) : chalk.white(s);
}

export function renderCard(card: Card, dimmed = false): string[] {
  const rank = card.rank as string;
  const suit = card.suit as string;

  const topRank = rank.padEnd(5);
  const botRank = rank.padStart(5);
  const midRow = `  ${suit}  `;

  const isRed = card.getColor() === "red";
  const content: (s: string) => string = dimmed
    ? isRed
      ? chalk.dim.red
      : chalk.dim
    : isRed
      ? chalk.red
      : chalk.white;
  const border: (s: string) => string = dimmed ? chalk.dim : (s) => s;

  return [
    border("┌─────┐"),
    `│${content(topRank)}│`,
    `│${content(midRow)}│`,
    `│${content(botRank)}│`,
    border("└─────┘"),
  ];
}

export function renderCardBack(): string[] {
  return [
    chalk.blue("┌─────┐"),
    chalk.blue("│▒▒▒▒▒│"),
    chalk.blue("│▒▒▒▒▒│"),
    chalk.blue("│▒▒▒▒▒│"),
    chalk.blue("└─────┘"),
  ];
}

export function renderHand(cards: Card[], validMask?: boolean[]): string {
  if (cards.length === 0) return "(empty hand)";
  return joinCards(
    cards.map((card, i) => renderCard(card, validMask ? !validMask[i] : false))
  );
}

export function renderBacks(count: number): string {
  if (count === 0) return "(no cards)";
  const display = Math.min(count, MAX_BACKS);
  return joinCards(Array.from({ length: display }, () => renderCardBack()));
}

export function renderCardPlaceholder(): string[] {
  return [
    chalk.dim("┌─────┐"),
    chalk.dim("│     │"),
    chalk.dim("│  ?  │"),
    chalk.dim("│     │"),
    chalk.dim("└─────┘"),
  ];
}

function joinCards(lines: string[][]): string {
  return Array.from({ length: CARD_HEIGHT }, (_, row) =>
    lines.map((cols) => cols[row]).join(GAP)
  ).join("\n");
}
