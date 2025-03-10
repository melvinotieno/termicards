import { Card, Rank, Suit } from "@/entities/card";
import { Deck } from "@/entities/deck";
import { describe, expect, test } from "bun:test";

describe("Deck", () => {
  test("should create a full deck if no cards are provided", () => {
    const deck = new Deck();
    expect(deck.length).toBe(52);
  });

  test("should return the correct cards when cards are provided", () => {
    const cards = [new Card(Rank.ACE, Suit.HEARTS)];
    const deck = new Deck(cards);
    expect(deck.length).toBe(cards.length);
  });

  test("should shuffle the deck", () => {
    const deck = new Deck();
    const originalOrder = [...deck.cards];
    deck.shuffle();
    expect(deck.cards).not.toEqual(originalOrder);
  });

  test("should deal the correct number of cards to each player", () => {
    const deck = new Deck();
    const { player, computer } = deck.deal(4);
    expect(player.length).toBe(4);
    expect(computer.length).toBe(4);
    expect(deck.length).toBe(52 - 8);
  });

  test("should throw an error if there are not enough cards to deal", () => {
    const deck = new Deck([new Card(Rank.ACE, Suit.HEARTS)]);
    expect(() => deck.deal(1)).toThrow("Not enough cards in the deck to deal");
  });

  test("should draw a card from the deck", () => {
    const deck = new Deck();
    const initialLength = deck.length;
    const card = deck.draw();
    expect(deck.length).toBe(initialLength - 1);
    expect(card).toBeInstanceOf(Card);
  });

  test("should throw an error if drawing from an empty deck", () => {
    const deck = new Deck([]);
    expect(() => deck.draw()).toThrow("The deck is empty");
  });
});
