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
import { recordResult } from "./stats";
import { readSettings, SPEED_MULTIPLIER } from "./settings";
import {
  clearScreen,
  hideCursor,
  showCursor,
  readKey,
  selectMenu,
  bar,
  KEY,
} from "./tui";

const SCORE: Partial<Record<Rank, number>> = {
  [Rank.EIGHT]: 50,
  [Rank.KING]:  10,
  [Rank.QUEEN]: 10,
  [Rank.JACK]:  10,
  [Rank.TEN]:   10,
  [Rank.ACE]:    1,
};

interface CrazyEightsState {
  playerHand:  SerializedCard[];
  computerHand: SerializedCard[];
  discardPile:  SerializedCard[];
  deckCards:    SerializedCard[];
  currentSuit:  string;
}

export default class CrazyEights extends Game {
  private discardPile: Card[] = [];
  private currentSuit: Suit = Suit.SPADES;
  private quitting = false;
  private message = "";
  private selectedCard = 0;
  private speedMult = 1.0;
  private highlightPlays = true;
  private autoSave = false;

  constructor() {
    super("Crazy Eights");
  }

  async play(resume = false): Promise<void> {
    const settings = await readSettings();
    this.speedMult      = SPEED_MULTIPLIER[settings.animationSpeed];
    this.highlightPlays = settings.highlightValidPlays;
    this.autoSave       = settings.autoSaveOnQuit;

    const saved = await readSave<CrazyEightsState>("crazy_eights");

    if (resume) {
      if (saved) {
        this.restoreState(saved.state);
      } else {
        this.setup();
      }
    } else if (saved) {
      const date = new Date(saved.savedAt).toLocaleString();
      const choice = await selectMenu({
        title: "TermiCards",
        subtitle: "Crazy Eights",
        items: [
          { name: `Continue  (saved ${date})`, value: "resume" },
          { name: "Start new game",            value: "new" },
        ],
      });

      if (choice === "resume") {
        this.restoreState(saved.state);
      } else {
        await deleteSave("crazy_eights");
        this.setup();
      }
    } else {
      this.setup();
    }

    hideCursor();

    while (true) {
      if (this.currentPlayer === 0) {
        await this.playerTurn();
        if (!this.quitting && this.autoSave && this.playerHand.length > 0 && this.computerHand.length > 0) {
          await this.saveState(true);
        }
      } else {
        await this.computerTurn();
      }

      if (this.quitting) break;

      if (this.playerHand.length === 0) {
        const score = this.calculateScore(this.computerHand);
        this.message = chalk.bold.green(`You win!  Score: ${score} points  —  press any key`);
        this.render();
        await readKey();
        await deleteSave("crazy_eights");
        await recordResult("crazy_eights", "win");
        break;
      }

      if (this.computerHand.length === 0) {
        const score = this.calculateScore(this.playerHand);
        this.message = chalk.bold.red(`Computer wins!  Score: ${score} points  —  press any key`);
        this.render();
        await readKey();
        await deleteSave("crazy_eights");
        await recordResult("crazy_eights", "loss");
        break;
      }

      this.currentPlayer = 1 - this.currentPlayer;
    }

    showCursor();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private render(controls?: string): void {
    clearScreen();
    const b = bar();

    process.stdout.write(
      `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Crazy Eights")}\n  ${b}\n\n`
    );

    process.stdout.write(`  ${chalk.dim(`Computer (${this.computerHand.length} cards):`)}\n`);
    process.stdout.write(renderBacks(this.computerHand.length) + "\n\n");

    const top = this.discardPile[this.discardPile.length - 1];
    const suitInfo =
      top.rank === Rank.EIGHT
        ? chalk.cyan(`declared: ${SUIT_LABELS[this.currentSuit]}`)
        : chalk.dim(SUIT_LABELS[this.currentSuit]);
    process.stdout.write(
      `  Discard: ${suitInfo}   ${chalk.dim(`Stock: ${this.deck.length}`)}\n`
    );
    for (const line of renderCard(top)) {
      process.stdout.write(`  ${line}\n`);
    }

    process.stdout.write("\n  Your hand:\n");
    const validMask = this.highlightPlays ? this.playerHand.map((c) => this.isValidPlay(c)) : undefined;
    const cursorIdx = controls !== undefined ? this.selectedCard : undefined;
    process.stdout.write(renderHand(this.playerHand, validMask, cursorIdx) + "\n");

    process.stdout.write(`\n  ${b}\n`);
    if (this.message) {
      process.stdout.write(`  ${this.message}\n  ${b}\n`);
    }
    if (controls) {
      process.stdout.write(`  ${controls}\n`);
    }
  }

  // ── Player turn ────────────────────────────────────────────────────────────

  private async playerTurn(): Promise<void> {
    let mustPlay = false;

    if (!this.playerHand.some((c) => this.isValidPlay(c))) {
      if (this.deck.length === 0) {
        this.message = chalk.yellow("No valid plays and stock is empty — you pass");
        this.render();
        await this.pause(1500);
        return;
      }

      let found = false;
      while (this.deck.length > 0) {
        const drawn = this.deck.draw();
        this.playerHand.push(drawn);
        this.message = chalk.dim(`Drawing… got ${formatCardInline(drawn)}`);
        this.render();
        await this.pause(300);
        if (this.isValidPlay(drawn)) {
          found = true;
          this.selectedCard = this.playerHand.length - 1;
          break;
        }
      }

      if (!found) {
        this.message = chalk.yellow("Stock exhausted — you pass");
        this.render();
        await this.pause(1500);
        return;
      }

      mustPlay = true;
    }

    const hasDraw = !mustPlay && this.deck.length > 0;
    this.clampCursor();

    for (;;) {
      this.render(this.controlsLine(hasDraw));
      const key = await readKey();

      if (key === KEY.LEFT) {
        this.selectedCard = Math.max(0, this.selectedCard - 1);
      } else if (key === KEY.RIGHT) {
        this.selectedCard = Math.min(this.playerHand.length - 1, this.selectedCard + 1);
      } else if (key === KEY.ENTER || key === " ") {
        const card = this.playerHand[this.selectedCard];
        if (!this.isValidPlay(card)) {
          this.message = chalk.red("That card can't be played here — dimmed cards are invalid");
          continue;
        }
        this.playerHand.splice(this.selectedCard, 1);
        this.clampCursor();
        await this.resolvePlay(card, this.playerHand, true);
        return;
      } else if ((key === "d" || key === "D") && hasDraw) {
        const drawn = this.deck.draw();
        this.playerHand.push(drawn);
        this.selectedCard = this.playerHand.length - 1;
        this.message = `Drew: ${formatCardInline(drawn)}`;
        return;
      } else if (key === "s" || key === "S") {
        await this.saveState();
        this.quitting = true;
        return;
      }
    }
  }

  // ── Computer turn ──────────────────────────────────────────────────────────

  private async computerTurn(): Promise<void> {
    this.message = chalk.dim("Computer is thinking…");
    this.render();
    await this.pause(700);

    let valid = this.computerHand.filter((c) => this.isValidPlay(c));

    if (valid.length === 0) {
      if (this.deck.length === 0) {
        this.message = chalk.dim("Computer passes.");
        this.render();
        await this.pause(1000);
        return;
      }

      while (this.deck.length > 0) {
        const drawn = this.deck.draw();
        this.computerHand.push(drawn);
        this.message = chalk.dim("Computer drew a card.");
        this.render();
        await this.pause(400);
        if (this.isValidPlay(drawn)) {
          valid = [drawn];
          break;
        }
      }

      if (valid.length === 0) {
        this.message = chalk.dim("Stock exhausted — computer passes.");
        this.render();
        await this.pause(1000);
        return;
      }
    }

    const nonEights = valid.filter((c) => c.rank !== Rank.EIGHT);
    const pick = nonEights.length > 0 ? nonEights[0] : valid[0];
    this.computerHand.splice(this.computerHand.indexOf(pick), 1);
    await this.resolvePlay(pick, this.computerHand, false);

    this.render();
    await this.pause(900);
  }

  // ── Resolve a card play ────────────────────────────────────────────────────

  private async resolvePlay(card: Card, hand: Card[], isPlayer: boolean): Promise<void> {
    const actor = isPlayer ? "You" : "Computer";

    if (card.rank === Rank.EIGHT) {
      let suit: Suit;
      if (isPlayer) {
        suit = await this.chooseSuit();
        hideCursor();
      } else {
        suit = this.bestSuitFor(hand);
        await this.pause(500);
      }
      this.discardPile.push(card);
      this.currentSuit = suit;
      this.message = `${actor} played ${formatCardInline(card)} — declared ${SUIT_LABELS[suit]}`;
    } else {
      this.discardPile.push(card);
      this.currentSuit = card.suit;
      this.message = `${actor} played ${formatCardInline(card)}`;
    }
  }

  // ── Suit chooser ───────────────────────────────────────────────────────────

  private async chooseSuit(): Promise<Suit> {
    const answer = await selectMenu({
      title: "TermiCards",
      subtitle: "Crazy Eights — Choose a Suit",
      items: Object.values(Suit).map((s) => ({
        name: SUIT_LABELS[s as Suit],
        value: s as string,
      })),
    });
    return answer as Suit;
  }

  // ── Game logic ─────────────────────────────────────────────────────────────

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

  private isValidPlay(card: Card): boolean {
    if (card.rank === Rank.EIGHT) return true;
    const top = this.discardPile[this.discardPile.length - 1];
    if (top.rank === Rank.EIGHT) return card.suit === this.currentSuit;
    return card.suit === top.suit || card.rank === top.rank;
  }

  private bestSuitFor(hand: Card[]): Suit {
    const counts: Record<Suit, number> = {
      [Suit.SPADES]: 0, [Suit.HEARTS]: 0, [Suit.CLUBS]: 0, [Suit.DIAMONDS]: 0,
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private controlsLine(canDraw: boolean): string {
    const parts = [
      `${chalk.dim("←/→")} Move`,
      `${chalk.dim("Enter")} Play`,
    ];
    if (canDraw) parts.push(`${chalk.dim("D")} Draw`);
    parts.push(`${chalk.dim("S")} Save & Quit`);
    return parts.join("   ");
  }

  private clampCursor(): void {
    this.selectedCard = Math.min(this.selectedCard, Math.max(0, this.playerHand.length - 1));
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.round(ms * this.speedMult)));
  }

  // ── Save / restore ─────────────────────────────────────────────────────────

  private async saveState(silent = false): Promise<void> {
    const state: CrazyEightsState = {
      playerHand:   serializeCards(this.playerHand),
      computerHand: serializeCards(this.computerHand),
      discardPile:  serializeCards(this.discardPile),
      deckCards:    serializeCards(this.deck.cards),
      currentSuit:  this.currentSuit,
    };
    await writeSave("crazy_eights", state);
    if (!silent) {
      this.message = chalk.green("Game saved — see you next time");
      this.render();
      await this.pause(1200);
    }
  }

  private restoreState(state: CrazyEightsState): void {
    this.playerHand   = deserializeCards(state.playerHand);
    this.computerHand = deserializeCards(state.computerHand);
    this.discardPile  = deserializeCards(state.discardPile);
    this.deck.cards.splice(0, this.deck.cards.length, ...deserializeCards(state.deckCards));
    this.currentSuit  = state.currentSuit as Suit;
    this.currentPlayer = 0;
  }
}
