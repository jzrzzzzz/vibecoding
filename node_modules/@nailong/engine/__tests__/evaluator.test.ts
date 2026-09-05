import { describe, it, expect } from 'vitest';
import {
  Card, Suit, Rank, HandType,
  create52Deck, shuffleDeck,
} from '../src/types';
import { evaluateBest, compareHands, determineWinners } from '../src/evaluator';

function card(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

describe('evaluateBest', () => {
  it('应该识别皇家同花顺', () => {
    const cards = [
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Hearts, Rank.King),
      card(Suit.Hearts, Rank.Queen),
      card(Suit.Hearts, Rank.Jack),
      card(Suit.Hearts, Rank.Ten),
      card(Suit.Diamonds, Rank.Two),
      card(Suit.Clubs, Rank.Three),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.RoyalFlush);
  });

  it('应该识别同花顺', () => {
    const cards = [
      card(Suit.Clubs, Rank.Nine),
      card(Suit.Clubs, Rank.Eight),
      card(Suit.Clubs, Rank.Seven),
      card(Suit.Clubs, Rank.Six),
      card(Suit.Clubs, Rank.Five),
      card(Suit.Hearts, Rank.Two),
      card(Suit.Diamonds, Rank.Three),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.StraightFlush);
    // 9-high straight flush
    expect(result.value[1]).toBe(9);
  });

  it('应该识别四条', () => {
    const cards = [
      card(Suit.Hearts, Rank.King),
      card(Suit.Diamonds, Rank.King),
      card(Suit.Clubs, Rank.King),
      card(Suit.Spades, Rank.King),
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Diamonds, Rank.Three),
      card(Suit.Clubs, Rank.Five),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.FourOfAKind);
  });

  it('应该识别葫芦', () => {
    const cards = [
      card(Suit.Hearts, Rank.Queen),
      card(Suit.Diamonds, Rank.Queen),
      card(Suit.Clubs, Rank.Queen),
      card(Suit.Spades, Rank.Jack),
      card(Suit.Hearts, Rank.Jack),
      card(Suit.Diamonds, Rank.Four),
      card(Suit.Clubs, Rank.Seven),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.FullHouse);
  });

  it('应该识别同花', () => {
    const cards = [
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Hearts, Rank.Queen),
      card(Suit.Hearts, Rank.Ten),
      card(Suit.Hearts, Rank.Seven),
      card(Suit.Hearts, Rank.Three),
      card(Suit.Diamonds, Rank.King),
      card(Suit.Clubs, Rank.Two),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.Flush);
  });

  it('应该识别顺子', () => {
    const cards = [
      card(Suit.Hearts, Rank.Nine),
      card(Suit.Diamonds, Rank.Eight),
      card(Suit.Clubs, Rank.Seven),
      card(Suit.Spades, Rank.Six),
      card(Suit.Hearts, Rank.Five),
      card(Suit.Diamonds, Rank.Two),
      card(Suit.Clubs, Rank.Three),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.Straight);
  });

  it('应该识别轮子顺子 A-2-3-4-5', () => {
    const cards = [
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Diamonds, Rank.Two),
      card(Suit.Clubs, Rank.Three),
      card(Suit.Spades, Rank.Four),
      card(Suit.Hearts, Rank.Five),
      card(Suit.Diamonds, Rank.Eight),
      card(Suit.Clubs, Rank.Nine),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.Straight);
    // 5-high straight
    expect(result.value[1]).toBe(5);
  });

  it('应该识别三条', () => {
    const cards = [
      card(Suit.Hearts, Rank.Ten),
      card(Suit.Diamonds, Rank.Ten),
      card(Suit.Clubs, Rank.Ten),
      card(Suit.Spades, Rank.Ace),
      card(Suit.Hearts, Rank.King),
      card(Suit.Diamonds, Rank.Four),
      card(Suit.Clubs, Rank.Two),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.ThreeOfAKind);
  });

  it('应该识别两对', () => {
    const cards = [
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Diamonds, Rank.Ace),
      card(Suit.Clubs, Rank.King),
      card(Suit.Spades, Rank.King),
      card(Suit.Hearts, Rank.Queen),
      card(Suit.Diamonds, Rank.Five),
      card(Suit.Clubs, Rank.Two),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.TwoPair);
    expect(result.value[1]).toBe(14); // Aces high
    expect(result.value[2]).toBe(13); // Kings low
  });

  it('应该识别一对', () => {
    const cards = [
      card(Suit.Hearts, Rank.Jack),
      card(Suit.Diamonds, Rank.Jack),
      card(Suit.Clubs, Rank.Ace),
      card(Suit.Spades, Rank.King),
      card(Suit.Hearts, Rank.Nine),
      card(Suit.Diamonds, Rank.Four),
      card(Suit.Clubs, Rank.Two),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.OnePair);
  });

  it('应该识别高牌', () => {
    const cards = [
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Diamonds, Rank.King),
      card(Suit.Clubs, Rank.Queen),
      card(Suit.Spades, Rank.Nine),
      card(Suit.Hearts, Rank.Seven),
      card(Suit.Diamonds, Rank.Four),
      card(Suit.Clubs, Rank.Two),
    ];
    const result = evaluateBest(cards);
    expect(result.type).toBe(HandType.HighCard);
    expect(result.value[1]).toBe(14); // Ace high
  });
});

describe('compareHands', () => {
  it('葫芦应该击败同花', () => {
    const fullHouse = evaluateBest([
      card(Suit.Hearts, Rank.Two),
      card(Suit.Diamonds, Rank.Two),
      card(Suit.Clubs, Rank.Two),
      card(Suit.Spades, Rank.Three),
      card(Suit.Hearts, Rank.Three),
    ]);
    const flush = evaluateBest([
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Hearts, Rank.King),
      card(Suit.Hearts, Rank.Queen),
      card(Suit.Hearts, Rank.Jack),
      card(Suit.Hearts, Rank.Nine),
    ]);
    expect(compareHands(fullHouse, flush)).toBeGreaterThan(0);
  });

  it('同样的手牌应该平局', () => {
    const a = evaluateBest([
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Diamonds, Rank.Ace),
      card(Suit.Clubs, Rank.King),
      card(Suit.Spades, Rank.King),
      card(Suit.Hearts, Rank.Queen),
    ]);
    const b = evaluateBest([
      card(Suit.Diamonds, Rank.Ace),
      card(Suit.Clubs, Rank.Ace),
      card(Suit.Hearts, Rank.King),
      card(Suit.Diamonds, Rank.King),
      card(Suit.Diamonds, Rank.Queen),
    ]);
    expect(compareHands(a, b)).toBe(0);
  });

  it('高踢脚的一对应该击败低踢脚的同样一对', () => {
    const highKicker = evaluateBest([
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Diamonds, Rank.Ace),
      card(Suit.Clubs, Rank.King),
      card(Suit.Spades, Rank.Queen),
      card(Suit.Hearts, Rank.Ten),
      card(Suit.Diamonds, Rank.Five),
      card(Suit.Clubs, Rank.Two),
    ]);
    const lowKicker = evaluateBest([
      card(Suit.Hearts, Rank.Ace),
      card(Suit.Diamonds, Rank.Ace),
      card(Suit.Clubs, Rank.Jack),
      card(Suit.Spades, Rank.Ten),
      card(Suit.Hearts, Rank.Nine),
      card(Suit.Diamonds, Rank.Five),
      card(Suit.Clubs, Rank.Two),
    ]);
    expect(compareHands(highKicker, lowKicker)).toBeGreaterThan(0);
  });
});

describe('determineWinners', () => {
  it('应该找出单个赢家', () => {
    const playerHands = new Map();
    playerHands.set('p1', evaluateBest([
      card(Suit.Hearts, Rank.Ace), card(Suit.Diamonds, Rank.Ace),
      card(Suit.Clubs, Rank.King), card(Suit.Spades, Rank.King),
      card(Suit.Hearts, Rank.Queen),
    ]));
    playerHands.set('p2', evaluateBest([
      card(Suit.Hearts, Rank.Two), card(Suit.Diamonds, Rank.Two),
      card(Suit.Clubs, Rank.King), card(Suit.Spades, Rank.King),
      card(Suit.Hearts, Rank.Queen),
    ]));
    const winners = determineWinners(playerHands);
    expect(winners).toEqual(['p1']);
  });

  it('应该处理平局', () => {
    const playerHands = new Map();
    const board = [
      card(Suit.Hearts, Rank.Ace), card(Suit.Diamonds, Rank.King),
      card(Suit.Clubs, Rank.Queen), card(Suit.Spades, Rank.Jack),
      card(Suit.Hearts, Rank.Ten),
    ];
    playerHands.set('p1', evaluateBest([...board, card(Suit.Diamonds, Rank.Two), card(Suit.Clubs, Rank.Three)]));
    playerHands.set('p2', evaluateBest([...board, card(Suit.Diamonds, Rank.Four), card(Suit.Clubs, Rank.Five)]));
    const winners = determineWinners(playerHands);
    // Both have the same straight, should tie
    expect(winners.length).toBe(2);
  });
});

describe('create52Deck', () => {
  it('应该创建 52 张牌', () => {
    const deck = create52Deck();
    expect(deck.length).toBe(52);
  });

  it('每张牌应该唯一', () => {
    const deck = create52Deck();
    const keys = deck.map(c => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });
});

describe('shuffleDeck', () => {
  it('洗牌后应该仍为 52 张', () => {
    const deck = create52Deck();
    const shuffled = shuffleDeck([...deck]);
    expect(shuffled.length).toBe(52);
  });

  it('洗牌后牌组内容应该不变', () => {
    const deck = create52Deck();
    const original = deck.map(c => `${c.suit}-${c.rank}`).sort().join(',');
    const shuffled = shuffleDeck([...deck]);
    const result = shuffled.map(c => `${c.suit}-${c.rank}`).sort().join(',');
    expect(original).toBe(result);
  });
});
