import select, { Separator } from "@inquirer/select";
import chalk from "chalk";
import { Game } from "./game";
import { Card, Rank, Suit } from "./entities/card";
import {
  formatCardInline,
  renderCard,
  renderBacks,
  renderHand,
  SUIT_LABELS,
} from "./ui";
import {
  readSave,
  writeSave,
  deleteSave,
  serializeCards,
  deserializeCards,
  type SerializedCard,
} from "./save";

const SCORE: Partial<Record<Rank, number>> = {
  [Rank.EIGHT]: 50,
  [Rank.KING]: 10,
  [Rank.QUEEN]: 10,
  [Rank.JACK]: 10,
  [Rank.TEN]: 10,
  [Rank.ACE]: 1,
};

interface CrazyEightsState {
  playerHand: SerializedCard[];
  computerHand: SerializedCard[];
  discardPile: SerializedCard[];
  deckCards: SerializedCard[];
  currentSuit: string;
}

type TurnChoice =
  | { action: "play"; index: number }
  | { action: "draw"; index: -1 }
  | { action: "save"; index: -1 };

type SelectChoice<T> = { value: T; name?: string; disabled?: boolean | string };

export default class CrazyEights extends Game {
  private discardPile: Card[] = [];
  private currentSuit: Suit = Suit.SPADES;
  private quitting = false;

  constructor() {
    super("Crazy Eights");
  }

  async play(): Promise<void> {
    const saved = await readSave<CrazyEightsState>("crazy_eights");

    if (saved) {
      const date = new Date(saved.savedAt).toLocaleString();
      const resume = await select<boolean>({
        message: `Saved Crazy Eights game found (${date}):`,
        choices: [
          { name: "Continue saved game", value: true },
          { name: "Start new game", value: false },
        ],
      });

      if (resume) {
        this.restoreState(saved.state);
        console.log(chalk.bold.green("\n  Resuming Crazy Eights!\n"));
      } else {
        await deleteSave("crazy_eights");
        this.setup();
        console.log(chalk.bold.green(`\n  Starting ${this.title}!\n`));
      }
    } else {
      this.setup();
      console.log(chalk.bold.green(`\n  Starting ${this.title}!\n`));
    }

    while (true) {
      this.displayState();

      if (this.currentPlayer === 0) {
        await this.playerTurn();
      } else {
        await this.computerTurn();
      }

      if (this.quitting) break;

      if (this.playerHand.length === 0) {
        const score = this.calculateScore(this.computerHand);
        console.log(chalk.bold.green(`\n  You win! You score ${score} points!\n`));
        await deleteSave("crazy_eights");
        break;
      }

      if (this.computerHand.length === 0) {
        const score = this.calculateScore(this.playerHand);
        console.log(chalk.bold.red(`\n  Computer wins! Computer scores ${score} points.\n`));
        await deleteSave("crazy_eights");
        break;
      }

      this.currentPlayer = 1 - this.currentPlayer;
    }
  }

  private setup(): void {
    this.deck.shuffle();
    const { player, computer } = this.deck.deal(5);
    this.playerHand = player;
    this.computerHand = computer;

    let starter = this.deck.draw();
    while (starter.rank === Rank.EIGHT) {
      const pos = Math.floor(Math.random() * this.deck.cards.length);
      this.deck.cards.splice(pos, 0, starter);
      starter = this.deck.draw();
    }

    this.discardPile = [starter];
    this.currentSuit = starter.suit;
  }

  private displayState(): void {
    const bar = chalk.dim("─".repeat(60));
    const top = this.discardPile[this.discardPile.length - 1];
    const suitNote =
      top.rank === Rank.EIGHT
        ? chalk.cyan(`  declared: ${SUIT_LABELS[this.currentSuit]}`)
        : "";

    console.log(`\n${bar}`);

    console.log(`\n  Computer (${this.computerHand.length} cards):`);
    for (const line of renderBacks(this.computerHand.length).split("\n")) {
      console.log(`  ${line}`);
    }

    console.log();
    console.log(
      `  Discard:${suitNote}   ${chalk.dim(`Stock: ${this.deck.length}`)}`
    );
    for (const line of renderCard(top)) {
      console.log(`  ${line}`);
    }

    console.log();
    console.log("  Your hand:");
    const validMask = this.playerHand.map((c) => this.isValidPlay(c));
    for (const line of renderHand(this.playerHand, validMask).split("\n")) {
      console.log(`  ${line}`);
    }

    console.log(`\n${bar}\n`);
  }

  private async playerTurn(): Promise<void> {
    let mustPlay = false;

    if (!this.playerHand.some((c) => this.isValidPlay(c))) {
      if (this.deck.length === 0) {
        console.log(
          chalk.yellow("\n  No valid plays and stock is empty. You pass.\n")
        );
        return;
      }

      console.log(chalk.yellow("\n  No valid plays — drawing...\n"));

      let found = false;
      while (this.deck.length > 0) {
        const drawn = this.deck.draw();
        this.playerHand.push(drawn);
        console.log(`  You drew: ${formatCardInline(drawn)}`);
        await this.pause(200);

        if (this.isValidPlay(drawn)) {
          found = true;
          break;
        }
      }

      if (!found) {
        console.log(chalk.yellow("\n  Stock exhausted. You pass.\n"));
        return;
      }

      mustPlay = true;
    }

    const choices: Array<SelectChoice<TurnChoice> | Separator> =
      this.playerHand.map((card, i) => ({
        name: formatCardInline(card),
        value: { action: "play" as const, index: i },
        disabled: !this.isValidPlay(card),
      }));

    if (!mustPlay && this.deck.length > 0) {
      choices.push(new Separator());
      choices.push({
        name: "Draw a card",
        value: { action: "draw" as const, index: -1 as const },
      });
    }

    choices.push(new Separator());
    choices.push({
      name: "Save and quit",
      value: { action: "save" as const, index: -1 as const },
    });

    const choice = await select<TurnChoice>({
      message: "Your turn:",
      choices,
    });

    if (choice.action === "save") {
      await this.saveState();
      this.quitting = true;
      return;
    }

    if (choice.action === "draw") {
      const drawn = this.deck.draw();
      this.playerHand.push(drawn);
      console.log(`\n  You drew: ${formatCardInline(drawn)}\n`);
      return;
    }

    const card = this.playerHand.splice(choice.index, 1)[0];
    await this.resolvePlay(card, this.playerHand, true);
  }

  private async computerTurn(): Promise<void> {
    console.log(chalk.cyan("\n  Computer's turn...\n"));
    await this.pause(700);

    let valid = this.computerHand.filter((c) => this.isValidPlay(c));

    if (valid.length === 0) {
      if (this.deck.length === 0) {
        console.log(chalk.cyan("  Computer passes.\n"));
        return;
      }

      while (this.deck.length > 0) {
        const drawn = this.deck.draw();
        this.computerHand.push(drawn);
        console.log(chalk.dim("  Computer drew a card."));
        await this.pause(400);

        if (this.isValidPlay(drawn)) {
          valid = [drawn];
          break;
        }
      }

      if (valid.length === 0) {
        console.log(chalk.cyan("  Stock exhausted. Computer passes.\n"));
        return;
      }
    }

    // Prefer non-eights; save eights as last resort
    const nonEights = valid.filter((c) => c.rank !== Rank.EIGHT);
    const pick = nonEights.length > 0 ? nonEights[0] : valid[0];

    this.computerHand.splice(this.computerHand.indexOf(pick), 1);
    await this.resolvePlay(pick, this.computerHand, false);
  }

  private async resolvePlay(
    card: Card,
    hand: Card[],
    isPlayer: boolean
  ): Promise<void> {
    const actor = isPlayer ? "You" : "Computer";

    if (card.rank === Rank.EIGHT) {
      let suit: Suit;

      if (isPlayer) {
        suit = await select({
          message: "Choose a suit:",
          choices: Object.values(Suit).map((s) => ({
            name: SUIT_LABELS[s as Suit],
            value: s as Suit,
          })),
        });
      } else {
        suit = this.bestSuitFor(hand);
        await this.pause(500);
      }

      this.discardPile.push(card);
      this.currentSuit = suit;
      console.log(
        `\n  ${actor} played ${formatCardInline(card)} — declared suit: ${SUIT_LABELS[suit]}\n`
      );
    } else {
      this.discardPile.push(card);
      this.currentSuit = card.suit;
      console.log(`\n  ${actor} played ${formatCardInline(card)}\n`);
    }
  }

  private isValidPlay(card: Card): boolean {
    if (card.rank === Rank.EIGHT) return true;
    const top = this.discardPile[this.discardPile.length - 1];
    if (top.rank === Rank.EIGHT) return card.suit === this.currentSuit;
    return card.suit === top.suit || card.rank === top.rank;
  }

  private bestSuitFor(hand: Card[]): Suit {
    const counts: Record<Suit, number> = {
      [Suit.SPADES]: 0,
      [Suit.HEARTS]: 0,
      [Suit.CLUBS]: 0,
      [Suit.DIAMONDS]: 0,
    };
    for (const card of hand) {
      if (card.rank !== Rank.EIGHT) counts[card.suit]++;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Suit;
  }

  private calculateScore(hand: Card[]): number {
    return hand.reduce((sum, c) => sum + this.cardValue(c), 0);
  }

  private cardValue(card: Card): number {
    return SCORE[card.rank] ?? parseInt(card.rank, 10);
  }

  private async saveState(): Promise<void> {
    const state: CrazyEightsState = {
      playerHand: serializeCards(this.playerHand),
      computerHand: serializeCards(this.computerHand),
      discardPile: serializeCards(this.discardPile),
      deckCards: serializeCards(this.deck.cards),
      currentSuit: this.currentSuit,
    };
    await writeSave("crazy_eights", state);
    console.log(chalk.green("\n  Game saved! See you next time.\n"));
  }

  private restoreState(state: CrazyEightsState): void {
    this.playerHand = deserializeCards(state.playerHand);
    this.computerHand = deserializeCards(state.computerHand);
    this.discardPile = deserializeCards(state.discardPile);
    this.deck.cards.splice(0, this.deck.cards.length, ...deserializeCards(state.deckCards));
    this.currentSuit = state.currentSuit as Suit;
    this.currentPlayer = 0;
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
