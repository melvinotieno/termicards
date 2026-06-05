import chalk from "chalk";
import { Card, Suit } from "./entities/card";

const GAP = "  ";
const CARD_WIDTH = 7;
const CARD_HEIGHT = 5;
const MAX_BACKS = 9;

export const SUIT_LABELS: Record<Suit, string> = {
  [Suit.SPADES]:   "♠ Spades",
  [Suit.HEARTS]:   "♥ Hearts",
  [Suit.CLUBS]:    "♣ Clubs",
  [Suit.DIAMONDS]: "♦ Diamonds",
};

export function formatCardInline(card: Card): string {
  const s = card.toString();
  return card.getColor() === "red" ? chalk.red(s) : chalk.white(s);
}

export function renderCard(card: Card, dimmed = false, selected = false): string[] {
  const rank = card.rank as string;
  const suit = card.suit as string;
  const topRank = rank.padEnd(5);
  const botRank = rank.padStart(5);
  const midRow  = `  ${suit}  `;
  const isRed = card.getColor() === "red";

  const content: (s: string) => string = selected
    ? isRed ? chalk.bold.red : chalk.bold.white
    : dimmed
      ? isRed ? chalk.dim.red : chalk.dim
      : isRed ? chalk.red : chalk.white;
  const border: (s: string) => string = selected
    ? chalk.bold.cyan
    : dimmed ? chalk.dim : (s) => s;

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

export function renderCardPlaceholder(): string[] {
  return [
    chalk.dim("┌─────┐"),
    chalk.dim("│     │"),
    chalk.dim("│  ?  │"),
    chalk.dim("│     │"),
    chalk.dim("└─────┘"),
  ];
}

export function renderHand(cards: Card[], validMask?: boolean[], selectedIndex?: number): string {
  if (cards.length === 0) return "  (empty hand)";
  const cardLines = cards.map((card, i) =>
    renderCard(card, validMask ? !validMask[i] : false, selectedIndex === i)
  );
  const rows = Array.from({ length: CARD_HEIGHT }, (_, row) =>
    "  " + cardLines.map((c) => c[row]).join(GAP)
  );
  if (selectedIndex !== undefined) {
    rows.push(renderCursorRow(cards.length, selectedIndex));
  }
  return rows.join("\n");
}

export function renderBacks(count: number): string {
  if (count === 0) return "  (no cards)";
  const display = Math.min(count, MAX_BACKS);
  const cardLines = Array.from({ length: display }, () => renderCardBack());
  return Array.from({ length: CARD_HEIGHT }, (_, row) =>
    "  " + cardLines.map((c) => c[row]).join(GAP)
  ).join("\n");
}

function renderCursorRow(count: number, selectedIndex: number): string {
  const parts = Array.from({ length: count }, (_, i) =>
    i === selectedIndex ? chalk.cyan("   ▲   ") : " ".repeat(CARD_WIDTH)
  );
  return "  " + parts.join(GAP);
}
