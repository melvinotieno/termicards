import { Rank, Suit } from "./enums";

export class Card {
  constructor(public readonly suit: Suit, public readonly rank: Rank) {}

  toString(): string {
    return `${this.rank}${this.suit}`;
  }
}
