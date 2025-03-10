import { Card, Rank, Suit } from "@/entities/card";
import { describe, expect, test } from "bun:test";

describe("Card", () => {
  test("should create a card with the correct suit and rank", () => {
    const card = new Card(Rank.ACE, Suit.HEARTS);
    expect(card.suit).toBe(Suit.HEARTS);
    expect(card.rank).toBe(Rank.ACE);
  });

  test("should return the correct color for red suits", () => {
    const heartCard = new Card(Rank.TWO, Suit.HEARTS);
    const diamondCard = new Card(Rank.THREE, Suit.DIAMONDS);
    expect(heartCard.getColor()).toBe("red");
    expect(diamondCard.getColor()).toBe("red");
  });

  test("should return the correct color for black suits", () => {
    const spadeCard = new Card(Rank.FOUR, Suit.SPADES);
    const clubCard = new Card(Rank.FIVE, Suit.CLUBS);
    expect(spadeCard.getColor()).toBe("black");
    expect(clubCard.getColor()).toBe("black");
  });

  test("should return true when comparing two equal cards", () => {
    const card1 = new Card(Rank.SIX, Suit.HEARTS);
    const card2 = new Card(Rank.SIX, Suit.HEARTS);
    expect(card1.equals(card2)).toBe(true);
  });

  test("should return false when comparing two unequal cards", () => {
    const card1 = new Card(Rank.SIX, Suit.HEARTS);
    const card2 = new Card(Rank.SEVEN, Suit.CLUBS);
    expect(card1.equals(card2)).toBe(false);
  });

  test("should return true when comparing a card to itself", () => {
    const card = new Card(Rank.EIGHT, Suit.DIAMONDS);
    expect(card.equals(card)).toBe(true);
  });

  test("should return the correct string representation of the card", () => {
    const card = new Card(Rank.ACE, Suit.HEARTS);
    expect(card.toString()).toBe(`${Rank.ACE}${Suit.HEARTS}`);
  });
});
