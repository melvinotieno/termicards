import select, { Separator } from "@inquirer/select";
import chalk from "chalk";
import { Game } from "./game";
import { Card, Rank, Suit } from "./entities/card";

const SCORE: Partial<Record<Rank, number>> = {
  [Rank.EIGHT]: 50,
  [Rank.KING]: 10,
  [Rank.QUEEN]: 10,
  [Rank.JACK]: 10,
  [Rank.TEN]: 10,
  [Rank.ACE]: 1,
};

type TurnChoice = { action: "play"; index: number } | { action: "draw"; index: -1 };
type SelectChoice<T> = { value: T; name?: string; disabled?: boolean | string };

export default class CrazyEights extends Game {
  private discardPile: Card[] = [];
  private currentSuit: Suit = Suit.SPADES;

  constructor() {
    super("Crazy Eights");
  }

  async play(): Promise<void> {
    this.setup();
    console.log(chalk.bold.green(`\n  Starting ${this.title}!\n`));

    while (true) {
      this.displayState();

      if (this.currentPlayer === 0) {
        await this.playerTurn();
      } else {
        await this.computerTurn();
      }

      if (this.playerHand.length === 0) {
        const score = this.calculateScore(this.computerHand);
        console.log(chalk.bold.green(`\n  You win! You score ${score} points!\n`));
        break;
      }

      if (this.computerHand.length === 0) {
        const score = this.calculateScore(this.playerHand);
        console.log(chalk.bold.red(`\n  Computer wins! Computer scores ${score} points.\n`));
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
    const bar = chalk.dim("─".repeat(52));
    const top = this.discardPile[this.discardPile.length - 1];
    const suitNote =
      top.rank === Rank.EIGHT
        ? chalk.cyan(` (declared: ${this.currentSuit})`)
        : "";

    console.log(`\n${bar}`);
    console.log(
      `  Computer: ${chalk.dim("■ ".repeat(this.computerHand.length).trimEnd())}  (${this.computerHand.length})`
    );
    console.log();
    console.log(
      `  Discard: ${this.formatCard(top)}${suitNote}    Stock: ${this.deck.length}`
    );
    console.log();
    console.log(
      `  Your hand:  ${this.playerHand
        .map((c) =>
          this.isValidPlay(c) ? this.formatCard(c) : chalk.dim(this.formatCard(c))
        )
        .join("   ")}`
    );
    console.log(bar);
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
        console.log(`  You drew: ${this.formatCard(drawn)}`);
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
        name: this.isValidPlay(card)
          ? this.formatCard(card)
          : chalk.dim(this.formatCard(card)),
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

    const choice = await select<TurnChoice>({
      message: "Your turn:",
      choices,
    });

    if (choice.action === "draw") {
      const drawn = this.deck.draw();
      this.playerHand.push(drawn);
      console.log(`\n  You drew: ${this.formatCard(drawn)}\n`);
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
            name: s,
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
        `\n  ${actor} played ${this.formatCard(card)} — declared suit: ${suit}\n`
      );
    } else {
      this.discardPile.push(card);
      this.currentSuit = card.suit;
      console.log(`\n  ${actor} played ${this.formatCard(card)}\n`);
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

  private formatCard(card: Card): string {
    const s = card.toString();
    return card.getColor() === "red" ? chalk.red(s) : chalk.white(s);
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
