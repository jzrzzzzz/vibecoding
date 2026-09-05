// ============================================================
// 牌组操作
// 已从 types.ts 通过辅助函数覆盖。
// 本文件提供牌组相关的附加工具。
// ============================================================

import { Card, create52Deck, shuffleDeck, dealCards } from './types';

/** 创建一副洗好的牌 */
export function createShuffledDeck(): Card[] {
  return shuffleDeck(create52Deck());
}

/** 发牌：给每位玩家发 n 张牌，返回 { playerCards, remainingDeck } */
export function dealToPlayers(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number
): { playerCards: Card[][]; remainingDeck: Card[] } {
  const remaining = [...deck];
  const playerCards: Card[][] = [];

  for (let p = 0; p < playerCount; p++) {
    playerCards.push(dealCards(remaining, cardsPerPlayer));
  }

  return { playerCards, remainingDeck: remaining };
}

/** 烧一张牌（Burn card），返回烧掉的牌和剩余牌组 */
export function burnCard(deck: Card[]): { burned: Card | null; remaining: Card[] } {
  if (deck.length === 0) return { burned: null, remaining: deck };
  const remaining = [...deck];
  const burned = remaining.shift()!;
  return { burned, remaining };
}

/** 牌组剩余数量 */
export function deckRemaining(deck: Card[]): number {
  return deck.length;
}
