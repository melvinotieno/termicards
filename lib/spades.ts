import chalk from "chalk";
import { Game } from "./game";
import { Card, Rank, Suit } from "./entities/card";
import { Deck } from "./entities/deck";
import {
  formatCardInline,
  renderCard,
  renderCardPlaceholder,
  renderBacks,
  renderHand,
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

const RANK_VALUE: Record<Rank, number> = {
  [Rank.TWO]:   2,  [Rank.THREE]: 3,  [Rank.FOUR]:  4,  [Rank.FIVE]:  5,
  [Rank.SIX]:   6,  [Rank.SEVEN]: 7,  [Rank.EIGHT]: 8,  [Rank.NINE]:  9,
  [Rank.TEN]:  10,  [Rank.JACK]: 11,  [Rank.QUEEN]:12,  [Rank.KING]: 13,
  [Rank.ACE]:  14,
};

const SUIT_ORDER = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];

interface SpadesState {
  playerHand:      SerializedCard[];
  computerHand:    SerializedCard[];
  playerScore:     number;
  computerScore:   number;
  playerBags:      number;
  computerBags:    number;
  playerBid:       number;
  computerBid:     number;
  playerTricks:    number;
  computerTricks:  number;
  spadesBroken:    boolean;
  targetScore:     number;
  dealerIsComputer:boolean;
}

export default class Spades extends Game {
  private playerScore      = 0;
  private computerScore    = 0;
  private playerBags       = 0;
  private computerBags     = 0;
  private playerBid        = 0;
  private computerBid      = 0;
  private playerTricks     = 0;
  private computerTricks   = 0;
  private spadesBroken     = false;
  private targetScore      = 200;
  private dealerIsComputer = false;
  private quitting         = false;
  private message          = "";
  private selectedCard     = 0;
  private trickComputer: Card | null = null;
  private trickPlayer:   Card | null = null;
  private speedMult        = 1.0;
  private highlightPlays   = true;
  private autoSave         = false;

  constructor() {
    super("Spades");
  }

  // ── Entry point ────────────────────────────────────────────────────────────

  async play(resume = false): Promise<void> {
    const settings = await readSettings();
    this.speedMult      = SPEED_MULTIPLIER[settings.animationSpeed];
    this.highlightPlays = settings.highlightValidPlays;
    this.autoSave       = settings.autoSaveOnQuit;

    const saved = await readSave<SpadesState>("spades");

    if (resume) {
      if (saved) {
        this.restoreState(saved.state);
        hideCursor();
        await this.runGameLoop(true);
        showCursor();
        return;
      }
    } else if (saved) {
      const date = new Date(saved.savedAt).toLocaleString();
      const choice = await selectMenu({
        title: "TermiCards",
        subtitle: "Spades",
        items: [
          { name: `Continue  (saved ${date})`, value: "resume" },
          { name: "Start new game",            value: "new" },
        ],
      });

      if (choice === "resume") {
        this.restoreState(saved.state);
        hideCursor();
        await this.runGameLoop(true);
        showCursor();
        return;
      }

      await deleteSave("spades");
    }

    this.targetScore = await this.pickTarget();
    this.dealerIsComputer = await this.highCardDraw();

    hideCursor();
    await this.runGameLoop(false);
    showCursor();
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  private async runGameLoop(resuming: boolean): Promise<void> {
    if (resuming) {
      await this.playHand(true);
      if (this.quitting) return;
      this.dealerIsComputer = !this.dealerIsComputer;
    }

    while (
      !this.quitting &&
      this.playerScore < this.targetScore &&
      this.computerScore < this.targetScore
    ) {
      await this.playHand(false);
      if (this.quitting) return;
      this.dealerIsComputer = !this.dealerIsComputer;
    }

    if (this.quitting) return;

    while (
      this.playerScore >= this.targetScore &&
      this.computerScore >= this.targetScore
    ) {
      this.message = chalk.yellow("Tied at target — playing one more hand…");
      await this.playHand(false);
      if (this.quitting) return;
      this.dealerIsComputer = !this.dealerIsComputer;
    }

    await deleteSave("spades");

    const playerWon = this.playerScore > this.computerScore;
    await recordResult("spades", playerWon ? "win" : "loss", this.playerScore);

    clearScreen();
    const b = bar();
    process.stdout.write(`\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Spades — Game Over")}\n  ${b}\n\n`);
    if (playerWon) {
      process.stdout.write(chalk.bold.green(
        `  You win the game!  Final: You ${this.playerScore} — Computer ${this.computerScore}\n\n`
      ));
    } else {
      process.stdout.write(chalk.bold.red(
        `  Computer wins!  Final: You ${this.playerScore} — Computer ${this.computerScore}\n\n`
      ));
    }
    process.stdout.write(`  ${b}\n  ${chalk.dim("Press any key…")}\n`);
    await readKey();
  }

  // ── Target score picker ────────────────────────────────────────────────────

  private async pickTarget(): Promise<number> {
    const answer = await selectMenu({
      title: "TermiCards",
      subtitle: "Spades — Target Score",
      items: [
        { name: "200 points", value: "200", description: "short game" },
        { name: "500 points", value: "500", description: "standard game" },
      ],
    });
    return parseInt(answer, 10);
  }

  // ── High-card draw for first dealer ───────────────────────────────────────

  private async highCardDraw(): Promise<boolean> {
    hideCursor();
    const tmp = new Deck();
    tmp.shuffle();
    const pc = tmp.draw();
    const cc = tmp.draw();
    const playerHigher = RANK_VALUE[pc.rank] >= RANK_VALUE[cc.rank];

    clearScreen();
    const b = bar();
    process.stdout.write(`\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Spades — First Dealer Draw")}\n  ${b}\n\n`);
    process.stdout.write(`  Drawing for first dealer (high card deals)…\n\n`);
    process.stdout.write(`  You drew:      ${formatCardInline(pc)}\n`);
    process.stdout.write(`  Computer drew: ${formatCardInline(cc)}\n\n`);

    if (playerHigher) {
      process.stdout.write(chalk.cyan("  You drew higher — you deal, computer leads first.\n\n"));
    } else {
      process.stdout.write(chalk.dim("  Computer drew higher — computer deals, you lead first.\n\n"));
    }

    process.stdout.write(`  ${b}\n  ${chalk.dim("Press any key…")}\n`);
    await readKey();

    return !playerHigher; // dealerIsComputer
  }

  // ── Hand lifecycle ─────────────────────────────────────────────────────────

  private async playHand(resuming: boolean): Promise<void> {
    if (!resuming) {
      this.deck = new Deck();
      this.deck.shuffle();
      const { player, computer } = this.deck.deal(13);
      this.playerHand   = player;
      this.computerHand = computer;
      this.playerTricks   = 0;
      this.computerTricks = 0;
      this.spadesBroken = false;
      this.trickComputer = null;
      this.trickPlayer   = null;
      this.sortHand(this.playerHand);
      this.sortHand(this.computerHand);
      await this.biddingPhase();
    }

    let leader = resuming ? 0 : (this.dealerIsComputer ? 0 : 1);
    const remaining = 13 - (this.playerTricks + this.computerTricks);

    for (let i = 0; i < remaining; i++) {
      leader = await this.playTrick(leader);
      if (this.quitting) return;
      if (this.autoSave && i < remaining - 1) {
        await this.saveState(true);
      }
    }

    if (!this.quitting) {
      await this.scoreHand();
    }
  }

  // ── Bidding ────────────────────────────────────────────────────────────────

  private async biddingPhase(): Promise<void> {
    let bid = 1;

    for (;;) {
      clearScreen();
      const b = bar();
      process.stdout.write(
        `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Spades — Bidding")}\n  ${b}\n\n`
      );
      process.stdout.write(
        `  ${chalk.cyan("You")}: ${this.playerScore} pts   ` +
        `${chalk.yellow("Computer")}: ${this.computerScore} pts   ` +
        `Target: ${this.targetScore}\n` +
        `  ${this.dealerIsComputer ? "Computer deals" : "You deal"}\n\n`
      );
      process.stdout.write("  Your hand:\n");
      process.stdout.write(renderHand(this.playerHand) + "\n\n");
      process.stdout.write(`  Your bid: ${chalk.bold.white(String(bid))}\n\n`);
      process.stdout.write(`  ${b}\n`);
      process.stdout.write(
        `  ${chalk.dim("↑")} More   ${chalk.dim("↓")} Fewer   ${chalk.dim("Enter")} Confirm\n`
      );

      const key = await readKey();
      if      (key === KEY.UP    && bid < 13) bid++;
      else if (key === KEY.DOWN  && bid > 1)  bid--;
      else if (key === KEY.ENTER) {
        this.playerBid = bid;
        break;
      }
    }

    this.computerBid = this.computeBid();

    clearScreen();
    const b = bar();
    process.stdout.write(
      `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Spades — Bids Placed")}\n  ${b}\n\n`
    );
    process.stdout.write(`  Your bid:      ${chalk.cyan(String(this.playerBid))}\n`);
    process.stdout.write(`  Computer bid:  ${chalk.yellow(String(this.computerBid))}\n\n`);
    process.stdout.write(`  ${b}\n  ${chalk.dim("Press any key to start the hand…")}\n`);
    await readKey();
  }

  // ── Trick play ─────────────────────────────────────────────────────────────

  private async playTrick(leader: number): Promise<number> {
    let playerCard: Card;
    let computerCard: Card;
    let ledSuit: Suit;

    this.trickComputer = null;
    this.trickPlayer   = null;

    if (leader === 0) {
      this.message = "Your lead.";
      const led = await this.playerLeads();
      if (led === null) return 0;
      playerCard = led;
      ledSuit = playerCard.suit;
      if (playerCard.suit === Suit.SPADES) this.spadesBroken = true;
      this.trickPlayer = playerCard;

      this.message = chalk.dim("Computer is thinking…");
      this.renderBoard();
      await this.pause(900);

      computerCard = this.computerFollows(ledSuit);
      if (computerCard.suit === Suit.SPADES) this.spadesBroken = true;
      this.trickComputer = computerCard;
    } else {
      computerCard = this.computerLeads();
      ledSuit = computerCard.suit;
      if (computerCard.suit === Suit.SPADES) this.spadesBroken = true;
      this.trickComputer = computerCard;

      this.message = chalk.dim("Computer leads…");
      this.renderBoard();
      await this.pause(700);

      this.message = "Your turn to follow.";
      playerCard = await this.playerFollows(ledSuit);
      if (playerCard.suit === Suit.SPADES) this.spadesBroken = true;
      this.trickPlayer = playerCard;
    }

    const winner = this.trickWinner(playerCard, computerCard, ledSuit);
    if (winner === "player") {
      this.playerTricks++;
      this.message = chalk.green("You win the trick!");
    } else {
      this.computerTricks++;
      this.message = chalk.yellow("Computer wins the trick.");
    }

    this.renderBoard();
    await this.pause(1300);

    this.trickComputer = null;
    this.trickPlayer   = null;
    return winner === "player" ? 0 : 1;
  }

  // ── Player actions ─────────────────────────────────────────────────────────

  private async playerLeads(): Promise<Card | null> {
    const canLeadSpades =
      this.spadesBroken || this.playerHand.every((c) => c.suit === Suit.SPADES);
    const validMask = this.playerHand.map(
      (c) => canLeadSpades || c.suit !== Suit.SPADES
    );
    this.clampCursor();

    for (;;) {
      this.renderBoard(
        `${chalk.dim("←/→")} Move   ${chalk.dim("Enter")} Lead   ${chalk.dim("S")} Save & Quit`,
        this.highlightPlays ? validMask : undefined
      );
      const key = await readKey();

      if (key === KEY.LEFT) {
        this.selectedCard = Math.max(0, this.selectedCard - 1);
      } else if (key === KEY.RIGHT) {
        this.selectedCard = Math.min(this.playerHand.length - 1, this.selectedCard + 1);
      } else if (key === KEY.ENTER || key === " ") {
        if (!validMask[this.selectedCard]) {
          this.message = chalk.red("Spades not broken yet — lead a different suit");
          continue;
        }
        const card = this.playerHand.splice(this.selectedCard, 1)[0];
        this.clampCursor();
        return card;
      } else if (key === "s" || key === "S") {
        await this.saveState();
        this.quitting = true;
        return null;
      }
    }
  }

  private async playerFollows(ledSuit: Suit): Promise<Card> {
    const mustFollow = this.playerHand.some((c) => c.suit === ledSuit);
    const validMask  = mustFollow
      ? this.playerHand.map((c) => c.suit === ledSuit)
      : Array(this.playerHand.length).fill(true) as boolean[];
    this.clampCursor();

    for (;;) {
      this.renderBoard(
        `${chalk.dim("←/→")} Move   ${chalk.dim("Enter")} Play`,
        this.highlightPlays ? validMask : undefined
      );
      const key = await readKey();

      if (key === KEY.LEFT) {
        this.selectedCard = Math.max(0, this.selectedCard - 1);
      } else if (key === KEY.RIGHT) {
        this.selectedCard = Math.min(this.playerHand.length - 1, this.selectedCard + 1);
      } else if (key === KEY.ENTER || key === " ") {
        if (!validMask[this.selectedCard]) {
          this.message = chalk.red(`Must follow ${ledSuit} — you have cards of that suit`);
          continue;
        }
        const card = this.playerHand.splice(this.selectedCard, 1)[0];
        this.clampCursor();
        return card;
      }
    }
  }

  // ── Computer actions ───────────────────────────────────────────────────────

  private computerLeads(): Card {
    const canLeadSpades =
      this.spadesBroken || this.computerHand.every((c) => c.suit === Suit.SPADES);
    let pool = canLeadSpades
      ? [...this.computerHand]
      : this.computerHand.filter((c) => c.suit !== Suit.SPADES);
    if (pool.length === 0) pool = [...this.computerHand];

    const nonSpades = pool
      .filter((c) => c.suit !== Suit.SPADES)
      .sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
    const spades = pool
      .filter((c) => c.suit === Suit.SPADES)
      .sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);

    const pick = nonSpades[0] ?? spades[0];
    this.computerHand.splice(this.computerHand.indexOf(pick), 1);
    return pick;
  }

  private computerFollows(ledSuit: Suit): Card {
    const canFollow     = this.computerHand.filter((c) => c.suit === ledSuit);
    const tricksNeeded  = this.computerBid - this.computerTricks;

    if (canFollow.length > 0) {
      canFollow.sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
      const pick = tricksNeeded > 0 ? canFollow[0] : canFollow[canFollow.length - 1];
      this.computerHand.splice(this.computerHand.indexOf(pick), 1);
      return pick;
    }

    if (tricksNeeded > 0) {
      const spades = this.computerHand
        .filter((c) => c.suit === Suit.SPADES)
        .sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);
      if (spades.length > 0) {
        this.computerHand.splice(this.computerHand.indexOf(spades[0]), 1);
        return spades[0];
      }
    }

    const lowest = [...this.computerHand].sort(
      (a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]
    )[0];
    this.computerHand.splice(this.computerHand.indexOf(lowest), 1);
    return lowest;
  }

  // ── Trick resolution ───────────────────────────────────────────────────────

  private trickWinner(playerCard: Card, computerCard: Card, ledSuit: Suit): "player" | "computer" {
    const pSpade = playerCard.suit === Suit.SPADES;
    const cSpade = computerCard.suit === Suit.SPADES;
    if (pSpade && !cSpade) return "player";
    if (cSpade && !pSpade) return "computer";
    if (pSpade && cSpade) {
      return RANK_VALUE[playerCard.rank] > RANK_VALUE[computerCard.rank] ? "player" : "computer";
    }
    const pFollowed = playerCard.suit === ledSuit;
    const cFollowed = computerCard.suit === ledSuit;
    if (pFollowed && !cFollowed) return "player";
    if (cFollowed && !pFollowed) return "computer";
    return RANK_VALUE[playerCard.rank] > RANK_VALUE[computerCard.rank] ? "player" : "computer";
  }

  // ── Scoring ────────────────────────────────────────────────────────────────

  private async scoreHand(): Promise<void> {
    this.applyScore(true);
    this.applyScore(false);

    clearScreen();
    const b = bar();
    process.stdout.write(
      `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Spades — Hand Results")}\n  ${b}\n\n`
    );
    process.stdout.write(
      `  ${chalk.cyan("You")}      bid ${this.playerBid}  won ${this.playerTricks} trick${this.playerTricks !== 1 ? "s" : ""}\n`
    );
    process.stdout.write(
      `  ${chalk.yellow("Computer")} bid ${this.computerBid}  won ${this.computerTricks} trick${this.computerTricks !== 1 ? "s" : ""}\n\n`
    );
    process.stdout.write(
      `  Running totals — ${chalk.cyan("You")}: ${this.playerScore}   ${chalk.yellow("Computer")}: ${this.computerScore}\n`
    );
    process.stdout.write(`  Target: ${this.targetScore}\n\n`);
    process.stdout.write(`  ${b}\n  ${chalk.dim("Press any key to continue…")}\n`);
    await readKey();
  }

  private applyScore(isPlayer: boolean): void {
    const tricks = isPlayer ? this.playerTricks : this.computerTricks;
    const bid    = isPlayer ? this.playerBid    : this.computerBid;

    if (tricks >= bid) {
      const over = tricks - bid;
      const pts  = bid * 10 + over;
      if (isPlayer) {
        this.playerBags  += over;
        this.playerScore += pts;
        if (this.playerBags >= 10) { this.playerBags -= 10; this.playerScore -= 100; }
      } else {
        this.computerBags  += over;
        this.computerScore += pts;
        if (this.computerBags >= 10) { this.computerBags -= 10; this.computerScore -= 100; }
      }
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private renderBoard(controls?: string, validMask?: boolean[]): void {
    clearScreen();
    const b = bar();

    process.stdout.write(
      `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Spades")}\n  ${b}\n\n`
    );

    process.stdout.write(
      `  ${chalk.cyan("You")}:       Bid ${this.playerBid}  Tricks ${this.playerTricks}/${this.playerBid}  ` +
      `Score ${this.playerScore}  Bags ${this.playerBags}\n`
    );
    process.stdout.write(
      `  ${chalk.yellow("Computer")}: Bid ${this.computerBid}  Tricks ${this.computerTricks}/${this.computerBid}  ` +
      `Score ${this.computerScore}  Bags ${this.computerBags}\n`
    );
    process.stdout.write(
      this.spadesBroken
        ? chalk.green("  ♠ Spades broken\n")
        : chalk.dim("  ♠ Spades not broken\n")
    );

    process.stdout.write(`\n  ${chalk.dim(`Computer (${this.computerHand.length} cards):`)}\n`);
    process.stdout.write(renderBacks(this.computerHand.length) + "\n");

    if (this.trickComputer !== null || this.trickPlayer !== null) {
      const cLines = this.trickComputer ? renderCard(this.trickComputer) : renderCardPlaceholder();
      const pLines = this.trickPlayer   ? renderCard(this.trickPlayer)   : renderCardPlaceholder();
      process.stdout.write("\n  Trick:\n");
      process.stdout.write(`    ${chalk.dim("Computer")}    ${chalk.dim("You")}\n`);
      for (let i = 0; i < 5; i++) {
        process.stdout.write(`  ${cLines[i]}  ${pLines[i]}\n`);
      }
    }

    process.stdout.write("\n  Your hand:\n");
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

  // ── Utilities ──────────────────────────────────────────────────────────────

  private sortHand(hand: Card[]): void {
    hand.sort((a, b) => {
      const sd = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      return sd !== 0 ? sd : RANK_VALUE[b.rank] - RANK_VALUE[a.rank];
    });
  }

  private clampCursor(): void {
    this.selectedCard = Math.min(this.selectedCard, Math.max(0, this.playerHand.length - 1));
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.round(ms * this.speedMult)));
  }

  // ── Compute bid (AI) ───────────────────────────────────────────────────────

  private computeBid(): number {
    let est = 0;
    for (const c of this.computerHand) {
      if (c.suit === Suit.SPADES) {
        if (c.rank === Rank.ACE)   est += 1.0;
        else if (c.rank === Rank.KING)  est += 0.85;
        else if (c.rank === Rank.QUEEN) est += 0.65;
        else if (c.rank === Rank.JACK)  est += 0.45;
        else if (c.rank === Rank.TEN)   est += 0.30;
        else if (c.rank === Rank.NINE)  est += 0.20;
      } else {
        if (c.rank === Rank.ACE)   est += 0.85;
        else if (c.rank === Rank.KING)  est += 0.50;
        else if (c.rank === Rank.QUEEN) est += 0.25;
      }
    }
    return Math.max(1, Math.round(est));
  }

  // ── Save / restore ─────────────────────────────────────────────────────────

  private async saveState(silent = false): Promise<void> {
    const state: SpadesState = {
      playerHand:       serializeCards(this.playerHand),
      computerHand:     serializeCards(this.computerHand),
      playerScore:      this.playerScore,
      computerScore:    this.computerScore,
      playerBags:       this.playerBags,
      computerBags:     this.computerBags,
      playerBid:        this.playerBid,
      computerBid:      this.computerBid,
      playerTricks:     this.playerTricks,
      computerTricks:   this.computerTricks,
      spadesBroken:     this.spadesBroken,
      targetScore:      this.targetScore,
      dealerIsComputer: this.dealerIsComputer,
    };
    await writeSave("spades", state);

    if (!silent) {
      clearScreen();
      const b = bar();
      process.stdout.write(`\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Spades")}\n  ${b}\n\n`);
      process.stdout.write(chalk.green("  Game saved — see you next time!\n\n"));
      process.stdout.write(`  ${b}\n  ${chalk.dim("Press any key…")}\n`);
      await readKey();
    }
  }

  private restoreState(state: SpadesState): void {
    this.playerHand       = deserializeCards(state.playerHand);
    this.computerHand     = deserializeCards(state.computerHand);
    this.playerScore      = state.playerScore;
    this.computerScore    = state.computerScore;
    this.playerBags       = state.playerBags;
    this.computerBags     = state.computerBags;
    this.playerBid        = state.playerBid;
    this.computerBid      = state.computerBid;
    this.playerTricks     = state.playerTricks;
    this.computerTricks   = state.computerTricks;
    this.spadesBroken     = state.spadesBroken;
    this.targetScore      = state.targetScore;
    this.dealerIsComputer = state.dealerIsComputer;
  }
}
