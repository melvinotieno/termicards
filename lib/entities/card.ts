/**
 * Represents the four suits in a standard deck of cards.
 */
export enum Suit {
  SPADES = "♠️",
  HEARTS = "❤️",
  CLUBS = "♣️",
  DIAMONDS = "♦️",
}

/**
 * Represents the thirteen ranks in a standard deck of cards.
 */
export enum Rank {
  ACE = "A",
  TWO = "2",
  THREE = "3",
  FOUR = "4",
  FIVE = "5",
  SIX = "6",
  SEVEN = "7",
  EIGHT = "8",
  NINE = "9",
  TEN = "10",
  JACK = "J",
  QUEEN = "Q",
  KING = "K",
}

/**
 * Represents a playing card with a suit and rank.
 */
export class Card {
  /**
   * Creates an instance of a card.
   *
   * @param rank - The rank of the card.
   * @param suit - The suit of the card.
   */
  constructor(public readonly rank: Rank, public readonly suit: Suit) {}

  /**
   * Returns the color of the card's suit.
   *
   * @returns The color of the suit as either "red" or "black".
   */
  getColor(): string {
    return this.suit === Suit.HEARTS || this.suit === Suit.DIAMONDS
      ? "red"
      : "black";
  }

  /**
   * Checks if this card is equal to another card.
   *
   * @param other - The other card to compare with.
   * @returns True if both cards have the same suit and rank, otherwise false.
   */
  equals(other: Card): boolean {
    return this.suit === other.suit && this.rank === other.rank;
  }

  /**
   * Returns a string representation of the card.
   *
   * @returns A string in the format of "{rank}{suit}".
   */
  toString(): string {
    return `${this.rank}${this.suit}`;
  }
}
