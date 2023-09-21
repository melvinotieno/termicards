import { describe, expect, test } from "bun:test";
import { Card } from "../lib/card";
import { Rank, Suit } from "../lib/enums";

describe("Card", () => {
  test("should be able to create a card", () => {
    const card = new Card(Suit.CLUBS, Rank.ACE);
    expect(card.suit).toBe(Suit.CLUBS);
    expect(card.rank).toBe(Rank.ACE);
  });

  test("should be able to convert a card to a string", () => {
    const card = new Card(Suit.CLUBS, Rank.ACE);
    expect(card.toString()).toBe(`${Rank.ACE}${Suit.CLUBS}`);
  });
});
