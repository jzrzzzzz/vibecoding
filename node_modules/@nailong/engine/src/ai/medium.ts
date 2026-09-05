// ============================================================
// 中等 AI — 机灵龙 🟡
// 计算底池赔率，有位置意识，偶尔诈唬
// ============================================================

import { ActionType, GameStateView } from '../types';
import { AIDecision, AIPlayerBase } from './base';
import { evaluateBest } from '../evaluator';
import { HandType } from '../types';

export class MediumAI extends AIPlayerBase {
  decide(view: GameStateView): AIDecision {
    const toCall = view.currentBet - view.self.currentBet;
    const potSize = view.pots.reduce((sum, p) => sum + p.amount, 0);
    const chips = view.self.chips;

    // 计算底池赔率
    const potOdds = potSize > 0 ? toCall / (potSize + toCall) : 0;

    // 估算手牌强度
    const strengthScore = this.evaluateStrength(view);
    // 0.0 ~ 1.0，越高越强

    // 位置加成（后位 +0.1）
    const positionBonus = this.isLatePosition(view) ? 0.1 : 0;
    const adjustedStrength = Math.min(1.0, strengthScore + positionBonus);

    // 诈唬概率：20%（但仅在赔率合适时）
    const bluffing = Math.random() < 0.20;

    if (bluffing && toCall > 0) {
      return this.semiBluff(view, toCall, potSize);
    }

    // 决策逻辑
    if (adjustedStrength > potOdds + 0.2) {
      // 牌力显著优于赔率 → 加注
      return this.valueRaise(view, toCall, potSize, adjustedStrength);
    } else if (adjustedStrength > potOdds - 0.1) {
      // 牌力勉强跟得上 → 跟注
      if (toCall === 0) {
        return { action: ActionType.Check, amount: 0 };
      }
      if (toCall >= chips) {
        return adjustedStrength > 0.5
          ? { action: ActionType.AllIn, amount: chips }
          : { action: ActionType.Fold, amount: 0 };
      }
      return { action: ActionType.Call, amount: 0 };
    } else {
      // 牌力不够 → 弃牌
      if (toCall === 0) {
        return { action: ActionType.Check, amount: 0 };
      }
      return { action: ActionType.Fold, amount: 0 };
    }
  }

  /** 评估手牌强度 0.0~1.0 */
  private evaluateStrength(view: GameStateView): number {
    const allCards = [...view.self.holeCards, ...view.communityCards];

    // 翻牌前
    if (view.communityCards.length === 0) {
      return this.preflopStrength(view.self.holeCards);
    }

    if (allCards.length < 5) return 0.3;

    const result = evaluateBest(allCards);

    // 根据牌型返回基础强度
    const typeStrength: Record<number, number> = {
      [HandType.RoyalFlush]: 1.0,
      [HandType.StraightFlush]: 0.98,
      [HandType.FourOfAKind]: 0.95,
      [HandType.FullHouse]: 0.88,
      [HandType.Flush]: 0.78,
      [HandType.Straight]: 0.72,
      [HandType.ThreeOfAKind]: 0.65,
      [HandType.TwoPair]: 0.55,
      [HandType.OnePair]: 0.40,
      [HandType.HighCard]: 0.15,
    };

    let base = typeStrength[result.type] ?? 0.15;

    // 对高牌做微调：高牌点数越高越强
    if (result.type === HandType.HighCard) {
      base += (result.value[1] || 2) / 100; // Ace=14 → +0.14
    }

    return Math.min(1.0, base);
  }

  /** 翻牌前手牌强度评估 */
  private preflopStrength(holeCards: import('../types').Card[]): number {
    const [c1, c2] = holeCards;
    let score = 0.2; // baseline

    // 对子
    if (c1.rank === c2.rank) {
      score = 0.3 + (c1.rank - 2) * 0.05; // 22=0.3, AA=0.9
    }
    // 同花
    else if (c1.suit === c2.suit) {
      score += 0.1;
      // 同花大牌
      if (c1.rank >= 10 && c2.rank >= 10) score += 0.2;
      // 同花 A
      if (c1.rank === 14 || c2.rank === 14) score += 0.1;
    }
    // 连牌
    else if (Math.abs(c1.rank - c2.rank) <= 2) {
      score += 0.05;
      if (c1.rank >= 10 && c2.rank >= 10) score += 0.15;
    }
    // 单牌实力
    else {
      score += (Math.max(c1.rank, c2.rank) - 2) * 0.02;
    }

    return Math.min(1.0, score);
  }

  /** 是否在后位（最后 2 个行动的玩家之一） */
  private isLatePosition(view: GameStateView): boolean {
    const activeCount = view.activePlayerCount;
    // 简化：假设 AI 在最后 1/3 的位置算后位
    // 实际使用时需要知道确切位置，这里做近似
    return activeCount <= 3; // 人少时位置优势明显
  }

  /** 价值加注 */
  private valueRaise(
    view: GameStateView,
    toCall: number,
    potSize: number,
    strength: number
  ): AIDecision {
    const chips = view.self.chips;
    // 加注量 = 底池 * 强度因子
    const factor = 0.5 + strength * 0.5; // 0.5~1.0
    const raiseAmount = Math.min(
      toCall + Math.floor(potSize * factor),
      chips
    );

    if (raiseAmount > toCall + view.config.bigBlind && chips > toCall) {
      return { action: ActionType.Raise, amount: raiseAmount };
    }
    // 不够加注 → 跟注
    if (toCall === 0) {
      return { action: ActionType.Check, amount: 0 };
    }
    if (toCall >= chips) {
      return { action: ActionType.AllIn, amount: chips };
    }
    return { action: ActionType.Call, amount: 0 };
  }

  /** 半诈唬 */
  private semiBluff(
    view: GameStateView,
    toCall: number,
    potSize: number
  ): AIDecision {
    const chips = view.self.chips;
    const bluffAmount = Math.min(
      toCall + Math.floor(potSize * 0.6),
      chips
    );

    if (bluffAmount > toCall && chips > toCall) {
      return { action: ActionType.Raise, amount: bluffAmount };
    }
    if (toCall >= chips) {
      return { action: ActionType.Fold, amount: 0 }; // 太贵不偷
    }
    return { action: ActionType.Call, amount: 0 };
  }
}
