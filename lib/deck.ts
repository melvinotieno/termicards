import { Card } from "./card";
import { ranks, suits } from "./constants";

export class Deck {
  constructor(public readonly cards: Card[] = []) {}

  /**
   * Get the number of cards in the deck.
   */

  get length(): number {
    return this.cards.length;
  }

  /**
   * Generate a deck of 52 cards.
   */

  generate(): void {
    for (const suit of suits) {
      for (const rank of ranks) {
        const card = new Card(suit, rank);
        this.cards.push(card);
      }
    }
  }

  /**
   * Shuffle the deck of cards using the Fisher-Yates algorithm.
   */

  shuffle(): void {
    for (let i = this.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[randomIndex]] = [
        this.cards[randomIndex],
        this.cards[i],
      ];
    }
  }

  /**
   * Deal a number of cards from the deck to each player.
   *
   * Dealing is done in a round-robin fashion, so that each player receives one
   * card at a time until the number of cards per hand is reached.
   *
   * @param cardsPerHand The number of cards to deal per hand. Defaults to 4.
   * @returns The cards dealt.
   */

  deal(cardsPerHand: number = 4): { user: Card[]; computer: Card[] } {
    // Since this is a terminal game, we can assume that the number of players
    // will always be 2 (the user and the computer).
    const user: Card[] = [];
    const computer: Card[] = [];

    // Make sure we have enough cards to deal to each player.
    // TODO: Uncomment this code once you've implemented the game loop.
    // if (this.length < cardsPerHand * 2) {
    //   throw new Error("Not enough cards to deal!");
    // }

    // Cards must be removed from the end of the array (the end of the array
    // represents the top of the deck).
    for (let i = 0; i < cardsPerHand; i++) {
      user.push(this.cards.pop()!);
      computer.push(this.cards.pop()!);
    }

    return { user, computer };
  }

  /**
   * Draw a card from the deck.
   *
   * @returns The card drawn.
   */

  draw(): Card {
    return this.cards.pop()!;
  }

  /**
   * Convert the deck of cards to a string.
   *
   * @returns The string representation of the deck.
   */

  toString(): string {
    let representation = "";

    for (let i = 0; i < this.length; i++) {
      // Maximum of 13 cards per row.
      if (i % 13 === 0) {
        representation += `\n${this.cards[i].toString()}\t`;
      } else {
        representation += `${this.cards[i].toString()}\t`;
      }
    }

    return representation;
  }
}
