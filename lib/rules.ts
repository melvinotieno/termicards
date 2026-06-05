export interface RulesSection {
  heading: string;
  body: string;
}

export interface GameRules {
  title: string;
  sections: RulesSection[];
}

export const RULES: Record<string, GameRules> = {
  crazy_eights: {
    title: "Crazy Eights",
    sections: [
      {
        heading: "Objective",
        body: "Be the first player to empty your hand. Your score is the total point value of cards remaining in your opponent's hand.",
      },
      {
        heading: "Setup",
        body: "Each player is dealt 5 cards. The top card of the remaining deck starts the discard pile. If the opening card is an 8, it is buried back into the deck and the next card is drawn.",
      },
      {
        heading: "Your Turn",
        body: "Play a card that matches either the suit or the rank of the top discard card. If you have no valid play, draw cards from the stock until you find one (or the stock runs out). If both are exhausted, you pass.",
      },
      {
        heading: "Eights Are Wild",
        body: "An 8 can be played on any card at any time. After playing an 8, you declare the active suit. The next player must match that suit or play another 8.",
      },
      {
        heading: "Scoring",
        body: "Eights = 50 pts\nFace cards (K / Q / J) = 10 pts\nAces = 1 pt\nNumber cards = face value",
      },
      {
        heading: "Controls",
        body: "← / →   Move card selector\nEnter / Space   Play selected card\nD   Draw from stock\nS   Save game and quit",
      },
    ],
  },
  spades: {
    title: "Spades",
    sections: [
      {
        heading: "Objective",
        body: "Be the first player to reach the target score (200 or 500 points) by accurately bidding and winning tricks each hand.",
      },
      {
        heading: "Setup & Bidding",
        body: "Each player is dealt 13 cards. Before play, both players bid the number of tricks they expect to win. A high-card draw decides the first dealer — the dealer's opponent leads the opening trick.",
      },
      {
        heading: "Playing Tricks",
        body: "The leader plays any card (except spades until spades are broken). The other player must follow suit if possible; otherwise they may play any card. The trick is won by the highest spade, or the highest card of the led suit if no spades were played.",
      },
      {
        heading: "Spades as Trump",
        body: "Spades are always trump and beat every other suit. You may not lead spades until a spade has been played on a previous trick ('spades broken'), unless spades are all you hold.",
      },
      {
        heading: "Scoring",
        body: "Meet your bid → 10 × bid points, plus 1 pt per overtrick (bag)\nFail your bid → 0 points that hand\nEvery 10 bags accumulated → −100 point penalty",
      },
      {
        heading: "Controls",
        body: "← / →   Move card selector\nEnter / Space   Play selected card\nS   Save game and quit (lead phase only)",
      },
    ],
  },
};
