// ============================================================
// AI 引擎基类
// 定义 AI 决策接口和公共方法
// ============================================================

import { PlayerAction, ActionType, GameStateView } from '../types';

/** AI 决策结果 */
export interface AIDecision {
  action: ActionType;
  amount: number;
}

/** AI 玩家基类 */
export abstract class AIPlayerBase {
  abstract decide(view: GameStateView): AIDecision;
}

export { ActionType };
