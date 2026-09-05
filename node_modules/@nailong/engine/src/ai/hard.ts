// ============================================================
// 困难 AI — 智者龙 🔴
// 手牌范围分析、Monte Carlo 胜率估算、GTO 简化策略
// ============================================================

import { ActionType, GameStateView, Card, Suit, Rank } from '../types';
import { AIDecision, AIPlayerBase } from './base';
import { evaluateBest, compareHands } from '../evaluator';
import { create52Deck, shuffleDeck } from '../types';

export class HardAI extends AIPlayerBase {
  decide(view: GameStateView): AIDecision {
    const toCall = view.currentBet - view.self.currentBet;
    const potSize = view.pots.reduce((sum, p) => sum + p.amount, 0);
    const chips = view.self.chips;

    // Monte Carlo 估算胜率
    const winRate = this.estimateWinRate(view);

    // 底池赔率
    const potOdds = potSize > 0 ? toCall / (potSize + toCall) : 0;

    // 决策矩阵
    const edge = winRate - potOdds;

    if (edge > 0.15) {
      // 显著优势 → 加注
      return this.aggressiveAction(view, winRate, toCall, potSize);
    } else if (edge > -0.05) {
      // 接近持平 → 跟注或过牌
      if (toCall === 0) {
        // 后位且有牌力，可做小注
        if (winRate > 0.5 && Math.random() < 0.3) {
          const probeBet = Math.floor(potSize * 0.33);
          if (probeBet > 0 && probeBet < chips) {
            return { action: ActionType.Raise, amount: probeBet };
          }
        }
        return { action: ActionType.Check, amount: 0 };
      }
      if (toCall >= chips) {
        return winRate > 0.4
          ? { action: ActionType.AllIn, amount: chips }
          : { action: ActionType.Fold, amount: 0 };
      }
      return { action: ActionType.Call, amount: 0 };
    } else {
      // 劣势 → 通常弃牌，偶尔诈唬
      if (toCall === 0) {
        // 免费看牌可以，但也可下注偷底池
        if (this.detectWeakness(view) && Math.random() < 0.15) {
          const stealBet = Math.floor(potSize * 0.5);
          if (stealBet > 0 && stealBet < chips) {
            return { action: ActionType.Raise, amount: stealBet };
          }
        }
        return { action: ActionType.Check, amount: 0 };
      }
      // 平衡诈唬频率 (~8%)
      if (Math.random() < 0.08) {
        return this.sophisticatedBluff(view, toCall, potSize);
      }
      return { action: ActionType.Fold, amount: 0 };
    }
  }

  /** Monte Carlo 胜率估算 */
  private estimateWinRate(view: GameStateView): number {
    const knownCards: Card[] = [
      ...view.self.holeCards,
      ...view.communityCards,
    ];

    const deck = create52Deck().filter(
      c => !knownCards.some(k => k.suit === c.suit && k.rank === c.rank)
    );

    const trials = 200; // 200 次采样（平衡速度与精度）
    let wins = 0;

    for (let t = 0; t < trials; t++) {
      // 洗牌
      shuffleDeck(deck);

      // 完成公共牌
      const simCommunity = [...view.communityCards];
      const neededCommunity = 5 - simCommunity.length;
      let cardIdx = 0;
      for (let i = 0; i < neededCommunity; i++) {
        simCommunity.push(deck[cardIdx++]);
      }

      // 评估自己的手牌
      const myCards = [...view.self.holeCards, ...simCommunity];
      const myBest = evaluateBest(myCards);

      // 模拟对手（随机发底牌）
      let iWin = true;
      for (const opp of view.opponents) {
        // 为对手随机分配 2 张底牌
        const oppCards = [deck[cardIdx++], deck[cardIdx++]];
        const oppBest = evaluateBest([...oppCards, ...simCommunity]);

        if (compareHands(oppBest, myBest) > 0) {
          iWin = false;
          break;
        }
        // 平局也算不赢
        if (compareHands(oppBest, myBest) === 0) {
          iWin = false;
          break;
        }
      }

      if (iWin) wins++;
    }

    return wins / trials;
  }

  /** 激进行动 */
  private aggressiveAction(
    view: GameStateView,
    winRate: number,
    toCall: number,
    potSize: number
  ): AIDecision {
    const chips = view.self.chips;

    // 强牌 (winRate > 0.75) → 大加注
    // 中等优势 (0.5~0.75) → 常规加注
    // 轻微优势 → 小加注
    let factor: number;
    if (winRate > 0.85) factor = 1.0;      // 几乎必胜 → 全押或底池大小
    else if (winRate > 0.7) factor = 0.75;
    else if (winRate > 0.5) factor = 0.5;
    else factor = 0.33;

    const raiseTo = Math.min(
      toCall + Math.floor(potSize * factor),
      chips
    );

    if (raiseTo > toCall + view.config.bigBlind && raiseTo < chips) {
      return { action: ActionType.Raise, amount: raiseTo };
    }
    // 加注不够 → 跟注，除非胜率极高才推 All-in
    if (winRate > 0.85 && toCall > 0 && chips <= toCall + potSize) {
      return { action: ActionType.AllIn, amount: chips };
    }
    if (toCall === 0) {
      return { action: ActionType.Check, amount: 0 };
    }
    if (toCall >= chips) {
      return winRate > 0.6
        ? { action: ActionType.AllIn, amount: chips }
        : { action: ActionType.Fold, amount: 0 };
    }
    return { action: ActionType.Call, amount: 0 };
  }

  /** 检测对手弱点（前一轮无人加注） */
  private detectWeakness(view: GameStateView): boolean {
    // 如果加注次数少且多人弃牌，可能对手牌力较弱
    return view.raiseCount === 0 && view.opponents.some(o => o.status === 'folded');
  }

  /** 精密诈唬（在危险牌面诈唬） */
  private sophisticatedBluff(
    view: GameStateView,
    toCall: number,
    potSize: number
  ): AIDecision {
    const chips = view.self.chips;

    // 在吓人牌面（如三张同花或连牌）加大诈唬力度
    const isScaryBoard = this.isScaryBoard(view.communityCards);

    const factor = isScaryBoard ? 0.75 : 0.45;
    const bluffTo = Math.min(
      toCall + Math.floor(potSize * factor),
      chips
    );

    if (bluffTo > toCall + view.config.bigBlind && bluffTo < chips) {
      return { action: ActionType.Raise, amount: bluffTo };
    }
    return { action: ActionType.Fold, amount: 0 };
  }

  /** 判断牌面是否"吓人"（同花面/连牌面） */
  private isScaryBoard(communityCards: Card[]): boolean {
    if (communityCards.length < 3) return false;

    // 同花检测：3 张同花色
    const suitCounts = new Map<Suit, number>();
    for (const c of communityCards) {
      suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1);
    }
    for (const count of suitCounts.values()) {
      if (count >= 3) return true;
    }

    // 连牌检测：3 张连续点数
    const ranks = communityCards.map(c => c.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length - 2; i++) {
      if (ranks[i + 2] - ranks[i] <= 4) return true;
    }

    return false;
  }
}
