// ============================================================
// 简单 AI — 新手龙 🟢
// 基于手牌强度做基本判断，极少诈唬
// ============================================================

import { ActionType, GameStateView } from '../types';
import { AIDecision, AIPlayerBase } from './base';
import { evaluateBest } from '../evaluator';
import { HandType } from '../types';

/** 粗略评估手牌强度（仅看底牌对公共牌的潜在影响） */
function handStrength(view: GameStateView): 'strong' | 'medium' | 'weak' {
  const allCards = [...view.self.holeCards, ...view.communityCards];
  if (allCards.length < 5) {
    // 翻牌前：仅看底牌
    const [c1, c2] = view.self.holeCards;
    // 大对子 (TT+)
    if (c1.rank === c2.rank && c1.rank >= 10) return 'strong';
    // 中等对子 (77-99)
    if (c1.rank === c2.rank && c1.rank >= 7) return 'medium';
    // 同花大牌
    if (c1.suit === c2.suit && c1.rank >= 10 && c2.rank >= 10) return 'strong';
    // 同花连牌
    if (c1.suit === c2.suit && Math.abs(c1.rank - c2.rank) <= 2) return 'medium';
    // 高牌
    if (c1.rank >= 12 || c2.rank >= 12) return 'medium';
    return 'weak';
  }

  // 翻牌后：用评估器
  const result = evaluateBest(allCards);
  if (result.type >= HandType.ThreeOfAKind) return 'strong';
  if (result.type >= HandType.OnePair) return 'medium';
  return 'weak';
}

export class EasyAI extends AIPlayerBase {
  decide(view: GameStateView): AIDecision {
    const strength = handStrength(view);
    const toCall = view.currentBet - view.self.currentBet;
    const potSize = view.pots.reduce((sum, p) => sum + p.amount, 0);
    const random = Math.random();

    // 10% 概率随机诈唬（不管牌力）
    if (random < 0.10) {
      return this.bluff(view, toCall, potSize);
    }

    switch (strength) {
      case 'strong':
        return this.playStrong(view, toCall, potSize);
      case 'medium':
        return this.playMedium(view, toCall, potSize);
      case 'weak':
        return this.playWeak(view, toCall);
    }
  }

  private playStrong(view: GameStateView, toCall: number, potSize: number): AIDecision {
    const chips = view.self.chips;
    // 60% 加注, 40% 跟注
    if (Math.random() < 0.6 && chips > toCall) {
      const raiseAmount = Math.min(
        Math.floor(potSize * 0.75),
        chips
      );
      if (raiseAmount > toCall + view.config.bigBlind) {
        return { action: ActionType.Raise, amount: raiseAmount };
      }
      // 加注额不够 → 跟注即可，不要无脑 All-in
      if (toCall === 0) {
        return { action: ActionType.Check, amount: 0 };
      }
      if (toCall >= chips) {
        return { action: ActionType.AllIn, amount: chips };
      }
      return { action: ActionType.Call, amount: 0 };
    }
    if (toCall === 0) {
      return { action: ActionType.Check, amount: 0 };
    }
    if (toCall >= chips) {
      return { action: ActionType.AllIn, amount: chips };
    }
    return { action: ActionType.Call, amount: 0 };
  }

  private playMedium(view: GameStateView, toCall: number, _potSize: number): AIDecision {
    const chips = view.self.chips;
    // 跟注为主，偶尔加注
    if (toCall === 0) {
      // 25% 小加注
      if (Math.random() < 0.25 && chips > view.config.bigBlind) {
        return { action: ActionType.Raise, amount: view.config.bigBlind };
      }
      return { action: ActionType.Check, amount: 0 };
    }
    // 跟注太大就弃牌
    if (toCall > chips * 0.3) {
      return { action: ActionType.Fold, amount: 0 };
    }
    if (toCall >= chips) {
      // 30% 概率 All-in
      return Math.random() < 0.3
        ? { action: ActionType.AllIn, amount: chips }
        : { action: ActionType.Fold, amount: 0 };
    }
    return { action: ActionType.Call, amount: 0 };
  }

  private playWeak(view: GameStateView, toCall: number): AIDecision {
    // 差牌：能免费就看，否则弃牌
    if (toCall === 0) {
      return { action: ActionType.Check, amount: 0 };
    }
    return { action: ActionType.Fold, amount: 0 };
  }

  private bluff(view: GameStateView, toCall: number, potSize: number): AIDecision {
    const chips = view.self.chips;
    // 诈唬：小加注吓唬人
    const bluffAmount = Math.min(
      Math.floor(potSize * 0.5),
      chips
    );
    if (bluffAmount > toCall && chips > view.config.bigBlind) {
      return { action: ActionType.Raise, amount: bluffAmount };
    }
    if (toCall > 0) {
      return { action: ActionType.Call, amount: 0 };
    }
    return { action: ActionType.Check, amount: 0 };
  }
}
