// ============================================================
// 手牌评估器
// 从 7 张牌（2 底牌 + 5 公共牌）中选出最佳 5 张组合
// ============================================================

import { Card, HandType, HandRank, Rank, Suit } from './types';

// ---- 内部工具 ----

/** 按点数降序排列 */
function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => b.rank - a.rank);
}

/** 统计每个点数的出现次数 */
function rankCounts(cards: Card[]): Map<number, Card[]> {
  const map = new Map<number, Card[]>();
  for (const c of cards) {
    const arr = map.get(c.rank) || [];
    arr.push(c);
    map.set(c.rank, arr);
  }
  return map;
}

/** 检查是否为顺子（5 张连续点数） */
function isStraight(ranks: number[]): { isStraight: boolean; highCard: number } {
  // 排序去重
  const sorted = [...new Set(ranks)].sort((a, b) => b - a);

  // 常规顺子：5 张连续
  if (sorted.length === 5 && sorted[0] - sorted[4] === 4) {
    return { isStraight: true, highCard: sorted[0] };
  }

  // 特殊：A-2-3-4-5 (Ace 当 1 用)
  if (sorted.length === 5 && sorted[0] === 14 && sorted[1] === 5 && sorted[4] === 2) {
    return { isStraight: true, highCard: 5 }; // 5-high straight
  }

  return { isStraight: false, highCard: 0 };
}

/** 检查是否为同花（5 张同一花色） */
function isFlush(cards: Card[]): { isFlush: boolean; flushCards: Card[] } {
  const bySuit = new Map<Suit, Card[]>();
  for (const c of cards) {
    const arr = bySuit.get(c.suit) || [];
    arr.push(c);
    bySuit.set(c.suit, arr);
  }
  for (const suitCards of bySuit.values()) {
    if (suitCards.length >= 5) {
      return { isFlush: true, flushCards: sortByRank(suitCards).slice(0, 5) };
    }
  }
  return { isFlush: false, flushCards: [] };
}

// ---- 手牌类型评估（5 张牌） ----

/** 评估一组 5 张牌的具体类型 */
function evaluate5(cards: Card[]): HandRank {
  const sorted = sortByRank(cards);
  const ranks = sorted.map(c => c.rank);
  const counts = rankCounts(sorted);
  const countValues = [...counts.entries()]
    .map(([rank, cards]) => ({ rank, count: cards.length, cards }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const flushResult = isFlush(sorted);
  const straightResult = isStraight(ranks);
  const isFlushHand = flushResult.isFlush;
  const isStraightHand = straightResult.isStraight;

  // 同花顺 / 皇家同花顺
  if (isFlushHand && isStraightHand) {
    const flushSorted = sortByRank(flushResult.flushCards);
    // 从同花牌中检查顺子
    const flushRanks = flushSorted.map(c => c.rank);
    const flushStraight = isStraight(flushRanks);
    if (flushStraight.isStraight) {
      const high = flushStraight.highCard;
      if (high === 14) {
        return { type: HandType.RoyalFlush, value: [HandType.RoyalFlush], cards: flushSorted.slice(0, 5) };
      }
      return { type: HandType.StraightFlush, value: [HandType.StraightFlush, high], cards: flushSorted.slice(0, 5) };
    }
  }

  // 四条
  if (countValues[0].count === 4) {
    const quad = countValues[0].rank;
    const kicker = countValues[1].rank;
    return { type: HandType.FourOfAKind, value: [HandType.FourOfAKind, quad, kicker], cards: sorted };
  }

  // 葫芦
  if (countValues[0].count === 3 && countValues[1].count === 2) {
    const trips = countValues[0].rank;
    const pair = countValues[1].rank;
    return { type: HandType.FullHouse, value: [HandType.FullHouse, trips, pair], cards: sorted };
  }

  // 同花
  if (isFlushHand) {
    const fCards = flushResult.flushCards;
    const fRanks = fCards.map(c => c.rank);
    return { type: HandType.Flush, value: [HandType.Flush, ...fRanks], cards: fCards };
  }

  // 顺子
  if (isStraightHand) {
    return { type: HandType.Straight, value: [HandType.Straight, straightResult.highCard], cards: sorted };
  }

  // 三条
  if (countValues[0].count === 3) {
    const trips = countValues[0].rank;
    const kickers = countValues.slice(1).map(v => v.rank).sort((a, b) => b - a);
    return { type: HandType.ThreeOfAKind, value: [HandType.ThreeOfAKind, trips, ...kickers], cards: sorted };
  }

  // 两对
  if (countValues[0].count === 2 && countValues[1].count === 2) {
    const highPair = Math.max(countValues[0].rank, countValues[1].rank);
    const lowPair = Math.min(countValues[0].rank, countValues[1].rank);
    const kicker = countValues[2].rank;
    return { type: HandType.TwoPair, value: [HandType.TwoPair, highPair, lowPair, kicker], cards: sorted };
  }

  // 一对
  if (countValues[0].count === 2) {
    const pair = countValues[0].rank;
    const kickers = countValues.slice(1).map(v => v.rank).sort((a, b) => b - a);
    return { type: HandType.OnePair, value: [HandType.OnePair, pair, ...kickers], cards: sorted };
  }

  // 高牌
  return { type: HandType.HighCard, value: [HandType.HighCard, ...ranks], cards: sorted };
}

// ---- 组合工具 ----

/** 生成 C(n,k) 的所有组合（以索引表示） */
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];

  function backtrack(start: number): void {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(i);
      backtrack(i + 1);
      combo.pop();
    }
  }

  backtrack(0);
  return result;
}

// ---- 公开 API ----

/**
 * 从 7 张牌中找出最佳 5 张组合
 * @param cards 7 张牌（2 张底牌 + 5 张公共牌）
 * @returns 最佳手牌评估结果
 */
export function evaluateBest(cards: Card[]): HandRank {
  if (cards.length < 5) {
    throw new Error(`需要至少 5 张牌，当前只有 ${cards.length} 张`);
  }

  // 对于 5 张牌，直接评估
  if (cards.length === 5) {
    return evaluate5(cards);
  }

  // C(n,5) 所有组合
  const combos = combinations(cards.length, 5);
  let best: HandRank | null = null;

  for (const indices of combos) {
    const five = indices.map(i => cards[i]);
    const rank = evaluate5(five);

    if (!best || compareHands(rank, best) > 0) {
      best = rank;
    }
  }

  return best!;
}

/**
 * 比较两手牌
 * @returns >0 表示 a 赢，<0 表示 b 赢，0 表示平局
 */
export function compareHands(a: HandRank, b: HandRank): number {
  const minLen = Math.min(a.value.length, b.value.length);
  for (let i = 0; i < minLen; i++) {
    if (a.value[i] !== b.value[i]) {
      return a.value[i] - b.value[i];
    }
  }
  return 0;
}

/**
 * 从多名玩家中找出赢家
 * @param playerHands 玩家 ID → 手牌评估结果
 * @returns 赢家玩家 ID 列表（可能平局）
 */
export function determineWinners(
  playerHands: Map<string, HandRank>
): string[] {
  let winners: string[] = [];
  let bestHand: HandRank | null = null;

  for (const [playerId, hand] of playerHands) {
    if (!bestHand || compareHands(hand, bestHand) > 0) {
      bestHand = hand;
      winners = [playerId];
    } else if (compareHands(hand, bestHand) === 0) {
      winners.push(playerId);
    }
  }

  return winners;
}
