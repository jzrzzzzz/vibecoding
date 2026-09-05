// ============================================================
// 下注逻辑
// 计算合法操作、最小/最大加注额等
// ============================================================

import { ActionType, Player, GameState } from './types';

/** 获取某玩家的合法操作列表 */
export function getAvailableActions(
  state: GameState,
  player: Player
): { type: ActionType; minRaise?: number; maxRaise?: number }[] {
  const actions: { type: ActionType; minRaise?: number; maxRaise?: number }[] = [];

  if (player.status !== 'active') return actions;

  const toCall = state.currentBet - player.currentBet;

  // Fold 永远可选（任何轮次、任何情况下都可以弃牌）
  actions.push({ type: ActionType.Fold });

  // Check（当不需要跟注时）
  if (toCall === 0) {
    actions.push({ type: ActionType.Check });
  }

  // Call（当需要跟注且筹码足够时）
  if (toCall > 0) {
    if (player.chips > toCall) {
      actions.push({ type: ActionType.Call });
    }
    // All-in（筹码不足以 Call 或刚好等于 Call）
    if (player.chips <= toCall) {
      actions.push({ type: ActionType.AllIn });
    }
  }

  // Raise / Bet（筹码大于当前跟注额时可选）
  if (player.chips > toCall) {
    // 最小加注总额 = 匹配当前最高注额 + 最小加注增量
    const minTotal = state.currentBet + calculateMinRaise(state);
    // 最大可加注总额 = 剩余筹码 + 本轮已下筹码
    const maxTotal = player.chips + player.currentBet;
    if (maxTotal > minTotal) {
      actions.push({ type: ActionType.Raise, minRaise: minTotal, maxRaise: maxTotal });
    }
  }

  // All-in 总是可选（如果有筹码）
  if (player.chips > 0 && !actions.find(a => a.type === ActionType.AllIn)) {
    // 检查是否已经有 All-in
    const hasAllIn = actions.some(a => a.type === ActionType.AllIn);
    if (!hasAllIn) {
      // 如果加注不可用但有筹码，可随时 All-in
      if (!actions.find(a => a.type === ActionType.Raise)) {
        actions.push({ type: ActionType.AllIn });
      }
    }
  }

  return actions;
}

/** 计算最小加注额 */
export function calculateMinRaise(state: GameState): number {
  // 最小加注额 = 大盲注（通常情况）
  // 如果有玩家加注过，则最小加注 = 上次加注的增量
  const bigBlind = state.config.bigBlind;
  return Math.max(bigBlind, state.totalRoundBet);
}

/** 获取当前活跃玩家数（未弃牌/未淘汰） */
export function getActivePlayerCount(state: GameState): number {
  return state.players.filter(
    p => p.status === 'active' || p.status === 'allin'
  ).length;
}

/** 检查当前轮次下注是否完成（所有活跃玩家下注一致或 All-in） */
export function isRoundComplete(state: GameState): boolean {
  const activePlayers = state.players.filter(
    p => p.status === 'active' || p.status === 'allin'
  );

  for (const p of activePlayers) {
    // All-in 的玩家不可能再加注，跳过
    if (p.status === 'allin') continue;
    // 有活跃玩家还没匹配当前最高下注
    if (p.currentBet < state.currentBet) return false;
    // 有活跃玩家本轮还没行动过（例如翻牌前的大盲位）
    if (!state.actedPlayerIds.includes(p.id)) return false;
  }

  return true;
}
