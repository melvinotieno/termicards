import select from "@inquirer/select";
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

const RANK_VALUE: Record<Rank, number> = {
  [Rank.TWO]: 2,
  [Rank.THREE]: 3,
  [Rank.FOUR]: 4,
  [Rank.FIVE]: 5,
  [Rank.SIX]: 6,
  [Rank.SEVEN]: 7,
  [Rank.EIGHT]: 8,
  [Rank.NINE]: 9,
  [Rank.TEN]: 10,
  [Rank.JACK]: 11,
  [Rank.QUEEN]: 12,
  [Rank.KING]: 13,
  [Rank.ACE]: 14,
};

const SUIT_ORDER = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
const CARD_W = 7;
const CARD_GAP = "  ";

export default class Spades extends Game {
  private playerScore = 0;
  private computerScore = 0;
  private playerBags = 0;
  private computerBags = 0;
  private playerBid = 0;
  private computerBid = 0;
  private playerTricks = 0;
  private computerTricks = 0;
  private spadesBroken = false;
  private targetScore = 200;
  private dealerIsComputer = false;

  constructor() {
    super("Spades");
  }

  async play(): Promise<void> {
    this.targetScore = await this.selectTarget();
    this.dealerIsComputer = await this.highCardDraw();

    console.log(
      chalk.bold.green(
        `\n  Starting ${this.title}! Target: ${this.targetScore} points\n`
      )
    );

    while (
      this.playerScore < this.targetScore &&
      this.computerScore < this.targetScore
    ) {
      await this.playHand();
      this.dealerIsComputer = !this.dealerIsComputer;
    }

    // Tiebreaker: both hit target in the same hand
    while (
      this.playerScore >= this.targetScore &&
      this.computerScore >= this.targetScore
    ) {
      console.log(
        chalk.yellow("\n  Tied at the target! Playing one more hand...\n")
      );
      await this.playHand();
      this.dealerIsComputer = !this.dealerIsComputer;
    }

    if (this.playerScore > this.computerScore) {
      console.log(
        chalk.bold.green(
          `\n  You win the game! Final: You ${this.playerScore} — Computer ${this.computerScore}\n`
        )
      );
    } else {
      console.log(
        chalk.bold.red(
          `\n  Computer wins the game! Final: You ${this.playerScore} — Computer ${this.computerScore}\n`
        )
      );
    }
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  private async selectTarget(): Promise<number> {
    return select<number>({
      message: "Select target score:",
      choices: [
        { name: "200 points (short game)", value: 200 },
        { name: "500 points (standard game)", value: 500 },
      ],
    });
  }

  private async highCardDraw(): Promise<boolean> {
    const tmp = new Deck();
    tmp.shuffle();
    const pc = tmp.draw();
    const cc = tmp.draw();

    console.log("\n  Drawing for first dealer (high card deals)...");
    console.log(`  You drew:      ${formatCardInline(pc)}`);
    console.log(`  Computer drew: ${formatCardInline(cc)}`);

    const playerHigher = RANK_VALUE[pc.rank] >= RANK_VALUE[cc.rank];
    if (playerHigher) {
      console.log(
        chalk.cyan("\n  You drew higher — you deal, computer leads first.\n")
      );
    } else {
      console.log(
        chalk.dim(
          "\n  Computer drew higher — computer deals, you lead first.\n"
        )
      );
    }
    await this.pause(1500);

    // dealerIsComputer = true → computer deals → player leads first
    return !playerHigher;
  }

  // ── Hand lifecycle ───────────────────────────────────────────────────────

  private async playHand(): Promise<void> {
    this.deck = new Deck();
    this.deck.shuffle();
    const { player, computer } = this.deck.deal(13);
    this.playerHand = player;
    this.computerHand = computer;
    this.playerTricks = 0;
    this.computerTricks = 0;
    this.spadesBroken = false;

    this.sortHand(this.playerHand);
    this.sortHand(this.computerHand);

    await this.biddingPhase();

    // non-dealer leads first
    let leader = this.dealerIsComputer ? 0 : 1;
    for (let i = 0; i < 13; i++) {
      leader = await this.playTrick(leader);
    }

    await this.scoreHand();
  }

  // ── Bidding ──────────────────────────────────────────────────────────────

  private async biddingPhase(): Promise<void> {
    const bar = chalk.dim("─".repeat(60));
    console.log(`\n${bar}`);
    console.log(chalk.bold("\n  Bidding Phase\n"));
    console.log(
      `  Running totals — ${chalk.cyan("You")}: ${this.playerScore}  ` +
        `${chalk.yellow("Computer")}: ${this.computerScore}`
    );
    console.log(
      `  ${this.dealerIsComputer ? "Computer deals" : "You deal"}\n`
    );

    console.log("  Your hand:");
    for (const line of renderHand(this.playerHand).split("\n")) {
      console.log(`  ${line}`);
    }
    console.log();

    this.playerBid = await select<number>({
      message: "How many tricks will you bid? (min 1)",
      choices: Array.from({ length: 13 }, (_, i) => ({
        name: String(i + 1),
        value: i + 1,
      })),
    });

    this.computerBid = this.computeBid();
    console.log(chalk.dim(`\n  Computer bids: ${this.computerBid}\n`));
    await this.pause(900);
  }

  private computeBid(): number {
    let est = 0;
    for (const c of this.computerHand) {
      if (c.suit === Suit.SPADES) {
        if (c.rank === Rank.ACE) est += 1.0;
        else if (c.rank === Rank.KING) est += 0.85;
        else if (c.rank === Rank.QUEEN) est += 0.65;
        else if (c.rank === Rank.JACK) est += 0.45;
        else if (c.rank === Rank.TEN) est += 0.30;
        else if (c.rank === Rank.NINE) est += 0.20;
      } else {
        if (c.rank === Rank.ACE) est += 0.85;
        else if (c.rank === Rank.KING) est += 0.50;
        else if (c.rank === Rank.QUEEN) est += 0.25;
      }
    }
    return Math.max(1, Math.round(est));
  }

  // ── Trick play ───────────────────────────────────────────────────────────

  private async playTrick(leader: number): Promise<number> {
    let playerCard: Card;
    let computerCard: Card;
    let ledSuit: Suit;

    if (leader === 0) {
      // Player leads
      this.displayBoard();
      playerCard = await this.playerLeads();
      ledSuit = playerCard.suit;
      if (playerCard.suit === Suit.SPADES) this.spadesBroken = true;

      this.displayBoard({ playerCard });
      console.log(chalk.dim("  Computer is thinking..."));
      await this.pause(900);

      computerCard = this.computerFollows(ledSuit);
      if (computerCard.suit === Suit.SPADES) this.spadesBroken = true;
    } else {
      // Computer leads
      computerCard = this.computerLeads();
      ledSuit = computerCard.suit;
      if (computerCard.suit === Suit.SPADES) this.spadesBroken = true;

      console.log(chalk.dim("\n  Computer leads...\n"));
      await this.pause(600);

      this.displayBoard({ computerCard });
      playerCard = await this.playerFollows(ledSuit);
      if (playerCard.suit === Suit.SPADES) this.spadesBroken = true;
    }

    this.displayBoard({ computerCard, playerCard });
    await this.pause(600);

    const winner = this.trickWinner(playerCard, computerCard, ledSuit);
    if (winner === "player") {
      this.playerTricks++;
      console.log(chalk.green("\n  You win the trick!\n"));
    } else {
      this.computerTricks++;
      console.log(chalk.yellow("\n  Computer wins the trick!\n"));
    }
    await this.pause(1300);

    return winner === "player" ? 0 : 1;
  }

  // ── Player actions ───────────────────────────────────────────────────────

  private async playerLeads(): Promise<Card> {
    const canLeadSpades =
      this.spadesBroken ||
      this.playerHand.every((c) => c.suit === Suit.SPADES);

    const choices = this.playerHand.map((card, i) => ({
      name: formatCardInline(card),
      value: i,
      disabled:
        !canLeadSpades && card.suit === Suit.SPADES
          ? "Spades not broken yet"
          : (false as const),
    }));

    const idx = await select<number>({ message: "Lead a card:", choices });
    return this.playerHand.splice(idx, 1)[0];
  }

  private async playerFollows(ledSuit: Suit): Promise<Card> {
    const mustFollow = this.playerHand.some((c) => c.suit === ledSuit);

    const choices = this.playerHand.map((card, i) => ({
      name: formatCardInline(card),
      value: i,
      disabled:
        mustFollow && card.suit !== ledSuit
          ? (`Must follow ${ledSuit}` as string)
          : (false as const),
    }));

    const idx = await select<number>({
      message: `Follow suit (${ledSuit}):`,
      choices,
    });
    return this.playerHand.splice(idx, 1)[0];
  }

  // ── Computer actions ─────────────────────────────────────────────────────

  private computerLeads(): Card {
    const canLeadSpades =
      this.spadesBroken ||
      this.computerHand.every((c) => c.suit === Suit.SPADES);

    let pool = canLeadSpades
      ? [...this.computerHand]
      : this.computerHand.filter((c) => c.suit !== Suit.SPADES);
    if (pool.length === 0) pool = [...this.computerHand];

    // Lead highest non-spade to preserve trumps; fall back to highest spade
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
    const canFollow = this.computerHand.filter((c) => c.suit === ledSuit);
    const tricksNeeded = this.computerBid - this.computerTricks;

    if (canFollow.length > 0) {
      canFollow.sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
      const pick =
        tricksNeeded > 0 ? canFollow[0] : canFollow[canFollow.length - 1];
      this.computerHand.splice(this.computerHand.indexOf(pick), 1);
      return pick;
    }

    // Can't follow — trump if still needs tricks
    if (tricksNeeded > 0) {
      const spades = this.computerHand
        .filter((c) => c.suit === Suit.SPADES)
        .sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);
      if (spades.length > 0) {
        this.computerHand.splice(this.computerHand.indexOf(spades[0]), 1);
        return spades[0];
      }
    }

    // Discard lowest value card
    const lowest = [...this.computerHand].sort(
      (a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]
    )[0];
    this.computerHand.splice(this.computerHand.indexOf(lowest), 1);
    return lowest;
  }

  // ── Trick resolution ─────────────────────────────────────────────────────

  private trickWinner(
    playerCard: Card,
    computerCard: Card,
    ledSuit: Suit
  ): "player" | "computer" {
    const pSpade = playerCard.suit === Suit.SPADES;
    const cSpade = computerCard.suit === Suit.SPADES;

    if (pSpade && !cSpade) return "player";
    if (cSpade && !pSpade) return "computer";
    if (pSpade && cSpade) {
      return RANK_VALUE[playerCard.rank] > RANK_VALUE[computerCard.rank]
        ? "player"
        : "computer";
    }

    // No spades played
    const pFollowed = playerCard.suit === ledSuit;
    const cFollowed = computerCard.suit === ledSuit;
    if (pFollowed && !cFollowed) return "player";
    if (cFollowed && !pFollowed) return "computer";

    return RANK_VALUE[playerCard.rank] > RANK_VALUE[computerCard.rank]
      ? "player"
      : "computer";
  }

  // ── Scoring ──────────────────────────────────────────────────────────────

  private async scoreHand(): Promise<void> {
    const bar = chalk.dim("─".repeat(60));
    console.log(`\n${bar}`);
    console.log(chalk.bold("\n  Hand Results\n"));
    console.log(
      `  You bid ${this.playerBid}, won ${this.playerTricks} trick${this.playerTricks !== 1 ? "s" : ""}`
    );
    console.log(
      `  Computer bid ${this.computerBid}, won ${this.computerTricks} trick${this.computerTricks !== 1 ? "s" : ""}`
    );
    console.log();

    this.applyScore(true);
    this.applyScore(false);

    console.log(
      `\n  Running totals — ${chalk.cyan("You")}: ${this.playerScore}  ` +
        `${chalk.yellow("Computer")}: ${this.computerScore}`
    );
    console.log(`  Target: ${this.targetScore}\n`);
    console.log(bar);

    await this.pause(2500);
  }

  private applyScore(isPlayer: boolean): void {
    const tricks = isPlayer ? this.playerTricks : this.computerTricks;
    const bid = isPlayer ? this.playerBid : this.computerBid;
    const label = isPlayer ? chalk.cyan("  You") : chalk.yellow("  Computer");

    if (tricks >= bid) {
      const over = tricks - bid;
      const pts = bid * 10 + over;

      if (isPlayer) {
        this.playerBags += over;
        this.playerScore += pts;
      } else {
        this.computerBags += over;
        this.computerScore += pts;
      }

      let msg = `${label}: +${pts} pts`;
      if (over > 0) msg += chalk.dim(` (${over} bag${over > 1 ? "s" : ""})`);

      const bags = isPlayer ? this.playerBags : this.computerBags;
      if (bags >= 10) {
        if (isPlayer) {
          this.playerBags -= 10;
          this.playerScore -= 100;
        } else {
          this.computerBags -= 10;
          this.computerScore -= 100;
        }
        msg += chalk.red(" −100 bag penalty!");
      }

      console.log(msg);
    } else {
      console.log(`${label}: broke contract — 0 pts`);
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────

  private displayBoard(trick?: { computerCard?: Card; playerCard?: Card }): void {
    const bar = chalk.dim("─".repeat(60));
    console.log(`\n${bar}`);
    console.log(
      `\n  ${chalk.cyan("You")}:       Bid ${this.playerBid}  ` +
        `Tricks ${this.playerTricks}/${this.playerBid}  ` +
        `Score ${this.playerScore}  Bags ${this.playerBags}`
    );
    console.log(
      `  ${chalk.yellow("Computer")}: Bid ${this.computerBid}  ` +
        `Tricks ${this.computerTricks}/${this.computerBid}  ` +
        `Score ${this.computerScore}  Bags ${this.computerBags}`
    );
    console.log(
      this.spadesBroken
        ? chalk.green("  ♠ Spades broken")
        : chalk.dim("  ♠ Spades not broken")
    );

    console.log(`\n  Computer (${this.computerHand.length} cards):`);
    for (const line of renderBacks(this.computerHand.length).split("\n")) {
      console.log(`  ${line}`);
    }

    if (trick) {
      const cLines = trick.computerCard
        ? renderCard(trick.computerCard)
        : renderCardPlaceholder();
      const pLines = trick.playerCard
        ? renderCard(trick.playerCard)
        : renderCardPlaceholder();

      // Header labels aligned over each card column
      const labelLine =
        "  " +
        "Computer".padEnd(CARD_W + CARD_GAP.length) +
        "You";
      console.log(`\n${labelLine}`);
      for (let i = 0; i < 5; i++) {
        console.log(`  ${cLines[i]}${CARD_GAP}${pLines[i]}`);
      }
    }

    console.log("\n  Your hand:");
    for (const line of renderHand(this.playerHand).split("\n")) {
      console.log(`  ${line}`);
    }

    console.log(`\n${bar}\n`);
  }

  private sortHand(hand: Card[]): void {
    hand.sort((a, b) => {
      const sd = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      return sd !== 0 ? sd : RANK_VALUE[b.rank] - RANK_VALUE[a.rank];
    });
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
