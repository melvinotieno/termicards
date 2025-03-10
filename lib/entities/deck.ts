import { Card, Rank, Suit } from "./card";

/**
 * Represents a deck of playing cards.
 */
export class Deck {
  /**
   * The cards in the deck.
   */
  public readonly cards: Card[];

  /**
   * Creates a deck of cards.
   *
   * @param cards Optional deck of cards, otherwise a full deck is generated.
   */
  constructor(cards?: Card[]) {
    this.cards = cards || this.generate();
  }

  /**
   * Returns the number of cards in the deck.
   */
  get length(): number {
    return this.cards.length;
  }

  /**
   * Shuffles the deck of cards using the Fisher-Yates algorithm.
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Deal a number of cards from the deck to each player.
   *
   * Dealing is done in a round-robin fashion, so that each player receives one
   * card at a time until the specified number of cards per hand is reached.
   *
   * @param cardsPerHand The number of cards to deal each player. Default is 4.
   * @returns An object containing the player and computer hands.
   * @throws Error if there are not enough cards in the deck to deal.
   */
  deal(cardsPerHand: number = 4): { player: Card[]; computer: Card[] } {
    if (this.length < cardsPerHand * 2) {
      throw new Error("Not enough cards in the deck to deal");
    }

    const player: Card[] = [];
    const computer: Card[] = [];

    for (let i = 0; i < cardsPerHand; i++) {
      player.push(this.cards.pop()!);
      computer.push(this.cards.pop()!);
    }

    return { player, computer };
  }

  /**
   * Draws a card from the deck.
   *
   * @returns The card drawn from the deck.
   * @throws Error if the deck is empty.
   */
  draw(): Card {
    if (this.length === 0) {
      throw new Error("The deck is empty");
    }

    return this.cards.pop()!;
  }

  /**
   * Generates a standard deck of cards (52 cards).
   *
   * @returns An array of Card objects representing a full deck.
   */
  private generate(): Card[] {
    const deck: Card[] = [];

    for (const rank of Object.values(Rank)) {
      for (const suit of Object.values(Suit)) {
        const card = new Card(rank, suit);
        deck.push(card);
      }
    }

    return deck;
  }
}
