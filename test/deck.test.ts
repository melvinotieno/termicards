import { describe, expect, test } from "bun:test";
import { Deck } from "../lib/deck";

describe("Deck", () => {
  test("should generate a deck of 52 cards", () => {
    const deck = new Deck();
    deck.generate();
    expect(deck.length).toEqual(52);
  });

  test("should shuffle the deck of cards", () => {
    const deck = new Deck();
    deck.generate();
    const originalCards = [...deck.cards];
    deck.shuffle();
    const shuffledCards = deck.cards;
    expect(shuffledCards).not.toEqual(originalCards);
  });

  test("should deal a number of cards to each player", () => {
    const deck = new Deck();
    deck.generate();
    const { user, computer } = deck.deal();
    expect(user.length).toEqual(4);
    expect(computer.length).toEqual(4);
    expect(deck.length).toEqual(44);
  });

  test("should draw a card from the deck", () => {
    const deck = new Deck();
    deck.generate();
    const topCard = deck.cards[deck.length - 1];
    const card = deck.draw();
    expect(card).toBeDefined();
    expect(deck.length).toEqual(51);
    expect(card).toEqual(topCard);
  });

  test("should be able to convert a deck to a string", () => {
    const deck = new Deck();
    deck.generate();
    expect(deck.toString()).toBeDefined();
  });
});
