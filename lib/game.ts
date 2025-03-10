import type { Card } from "./entities/card";
import { Deck } from "./entities/deck";

export abstract class Game {
  /**
   * The player's hand of cards.
   */
  playerHand: Card[] = [];

  /**
   * The computer's hand of cards.
   */
  computerHand: Card[] = [];

  /**
   * The index of the current player. 0 for player, 1 for computer.
   */
  currentPlayer: number = 0;

  /**
   * Initializes a new instance of the Game class.
   *
   * @param title The title of the game.
   */
  constructor(public readonly title: string) {
    this.deck = new Deck();
  }

  /**
   * The deck of cards used in the game.
   */
  protected deck: Deck;

  /**
   * Starts the game.
   */
  abstract play(): void;
}
