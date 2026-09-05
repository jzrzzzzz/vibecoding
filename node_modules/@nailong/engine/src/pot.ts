// ============================================================
// 底池管理
// 包含主池和边池的创建与分配逻辑
// ============================================================

import { Pot, Player } from './types';

/**
 * 计算底池分配
 * 当存在 All-in 玩家且筹码不足时，需要创建边池
 *
 * 算法：
 * 1. 按每位玩家本局总投入排序
 * 2. 对每个投入层级，为该层级及以上的所有未弃牌玩家创建一个边池
 */
export function calculatePots(players: Player[]): Pot[] {
  // 筛选未弃牌的玩家
  const activePlayers = players.filter(
    p => p.status !== 'folded' && p.status !== 'eliminated' && p.status !== 'waiting'
  );

  if (activePlayers.length === 0) return [];

  // 按总投入升序排列
  const sortedByBet = [...activePlayers].sort((a, b) => a.totalBet - b.totalBet);

  const pots: Pot[] = [];
  let previousLevel = 0;

  for (let i = 0; i < sortedByBet.length; i++) {
    const level = sortedByBet[i].totalBet;
    if (level <= previousLevel) continue; // 跳过相同投入

    const increment = level - previousLevel;
    // 投入 >= 此级别的玩家才有资格
    const eligible = sortedByBet.filter(p => p.totalBet >= level);

    pots.push({
      amount: increment * eligible.length,
      eligiblePlayerIds: eligible.map(p => p.id),
    });

    previousLevel = level;
  }

  return pots;
}

/**
 * 分配底池给赢家
 * @param pots 底池列表
 * @param winners 赢家 ID 列表
 * @param players 所有玩家（用于计算座位顺序，奇数筹码分配给庄家左侧最近的赢家）
 * @param dealerIndex 庄家座位索引
 * @returns 每位赢家获得的筹码 Map<playerId, amount>
 */
export function distributePots(
  pots: Pot[],
  winners: string[],
  players: Player[] = [],
  dealerIndex: number = 0
): Map<string, number> {
  const distribution = new Map<string, number>();

  for (const pot of pots) {
    // 此池中有资格且是赢家的玩家
    const potWinners = winners.filter(w => pot.eligiblePlayerIds.includes(w));

    if (potWinners.length === 0) {
      // 没有赢家在此池中 → 还给有资格的人（每人等额，或给唯一有资格的）
      for (const pid of pot.eligiblePlayerIds) {
        distribution.set(pid, (distribution.get(pid) || 0) + pot.amount / pot.eligiblePlayerIds.length);
      }
      continue;
    }

    // 赢家平分
    const share = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount - share * potWinners.length;

    for (const winnerId of potWinners) {
      distribution.set(winnerId, (distribution.get(winnerId) || 0) + share);
    }
    // 余数按德州扑克规则分给庄家左侧最近的赢家
    if (remainder > 0 && potWinners.length > 0) {
      const n = players.length;
      // 按庄家左侧距离排序（顺时针，越近越优先）
      const sortedByPosition = [...potWinners].sort((a, b) => {
        const playerA = players.find(p => p.id === a);
        const playerB = players.find(p => p.id === b);
        if (!playerA || !playerB) return 0;
        // 距离 = (seatIndex - dealerIndex + n) % n，越小的非零值越靠近庄家左侧
        const distA = (playerA.seatIndex - dealerIndex + n) % n;
        const distB = (playerB.seatIndex - dealerIndex + n) % n;
        return distA - distB;
      });
      distribution.set(
        sortedByPosition[0],
        (distribution.get(sortedByPosition[0]) || 0) + remainder
      );
    }
  }

  return distribution;
}

/** 计算底池总金额（用于 UI 显示） */
export function totalPotAmount(pots: Pot[]): number {
  return pots.reduce((sum, p) => sum + p.amount, 0);
}
