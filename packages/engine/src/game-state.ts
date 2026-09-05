// ============================================================
// 游戏状态机
// 管理德州扑克完整流程：PreFlop → Flop → Turn → River → Showdown
// ============================================================

import {
  Card, Player, GameState, GamePhase, GameConfig,
  PlayerStatus, ActionType, PlayerAction, Pot,
  dealCards,
} from './types';
import { createShuffledDeck, burnCard } from './deck';
import { getAvailableActions, isRoundComplete } from './betting';
import { calculatePots, distributePots } from './pot';
import { evaluateBest, compareHands, determineWinners } from './evaluator';

// ---- 工厂函数 ----

/** 默认游戏配置 */
export const DEFAULT_CONFIG: GameConfig = {
  smallBlind: 5,
  bigBlind: 10,
  initialChips: 1000,
  actionTimeout: 15,
};

/** 创建一个玩家 */
export function createPlayer(
  id: string,
  name: string,
  chips: number,
  seatIndex: number,
  isAI: boolean = false,
  aiDifficulty?: 'easy' | 'medium' | 'hard'
): Player {
  return {
    id,
    name,
    chips,
    holeCards: [],
    status: PlayerStatus.Active,
    currentBet: 0,
    totalBet: 0,
    seatIndex,
    isAI,
    aiDifficulty: aiDifficulty as Player['aiDifficulty'],
  };
}

/** 创建初始游戏状态 */
export function createGameState(
  players: Player[],
  config: GameConfig = DEFAULT_CONFIG
): GameState {
  return {
    players: [...players].sort((a, b) => a.seatIndex - b.seatIndex),
    deck: [],
    communityCards: [],
    pots: [],
    phase: GamePhase.Idle,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    currentBet: 0,
    totalRoundBet: 0,
    config,
    handNumber: 0,
    actedPlayerIds: [],
  };
}

/** 获取下一位活跃玩家（座位序循环） */
export function getNextActivePlayerIndex(state: GameState): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (state.currentPlayerIndex + i) % n;
    const p = state.players[idx];
    if (p.status === PlayerStatus.Active) return idx;
  }
  return state.currentPlayerIndex; // 没人了
}

// ---- 手牌流程 ----

/** 开始一手新牌 */
export function startHand(state: GameState): GameState {
  // 深拷贝避免修改原状态（否则 React 检测不到 players 数组变化）
  const next = deepCloneState(state);
  next.deck = createShuffledDeck();
  next.handNumber++;
  next.communityCards = [];
  next.pots = [];
  next.phase = GamePhase.PreFlop;

  // 重置活跃玩家状态
  const activePlayers = next.players.filter(
    p => p.status !== PlayerStatus.Eliminated && p.status !== PlayerStatus.Waiting
  );

  // 最少需要 2 名有筹码的玩家
  if (activePlayers.length < 2) {
    next.phase = GamePhase.Idle;
    return next;
  }

  for (const p of next.players) {
    if (p.status !== PlayerStatus.Eliminated && p.status !== PlayerStatus.Waiting) {
      p.status = PlayerStatus.Active;
      p.holeCards = [];
      p.currentBet = 0;
      p.totalBet = 0;
    }
  }

  // 发底牌：每人 2 张
  for (const p of activePlayers) {
    p.holeCards = dealCards(next.deck, 2);
  }

  // 重置本轮行动记录（盲注是强制的，不算"行动过"）
  next.actedPlayerIds = [];

  // 庄家按钮移到下一位活跃玩家
  next.dealerIndex = getNextDealerIndex(next);

  // 小盲/大盲
  // 特殊规则：单挑模式（2人）时，庄家 = 小盲注
  const activeCount = activePlayers.length;
  let smallBlindIdx: number;
  let bigBlindIdx: number;
  if (activeCount === 2) {
    smallBlindIdx = next.dealerIndex;
    bigBlindIdx = getNextActivePlayerFrom(next, smallBlindIdx);
  } else {
    smallBlindIdx = getNextActivePlayerFrom(next, next.dealerIndex);
    bigBlindIdx = getNextActivePlayerFrom(next, smallBlindIdx);
  }

  // 小盲下注
  const sbAmount = Math.min(next.config.smallBlind, next.players[smallBlindIdx].chips);
  next.players[smallBlindIdx].chips -= sbAmount;
  next.players[smallBlindIdx].currentBet = sbAmount;
  next.players[smallBlindIdx].totalBet = sbAmount;
  if (next.players[smallBlindIdx].chips === 0) {
    next.players[smallBlindIdx].status = PlayerStatus.AllIn;
  }

  // 大盲下注
  const bbAmount = Math.min(next.config.bigBlind, next.players[bigBlindIdx].chips);
  next.players[bigBlindIdx].chips -= bbAmount;
  next.players[bigBlindIdx].currentBet = bbAmount;
  next.players[bigBlindIdx].totalBet = bbAmount;
  next.players[bigBlindIdx].status = next.players[bigBlindIdx].chips === 0
    ? PlayerStatus.AllIn
    : PlayerStatus.Active;

  next.currentBet = Math.max(sbAmount, bbAmount);
  next.totalRoundBet = next.currentBet;

  // 第一个行动的是大盲之后的下一位
  next.currentPlayerIndex = getNextActivePlayerFrom(next, bigBlindIdx);

  return next;
}

/** 庄家按钮移动 */
function getNextDealerIndex(state: GameState): number {
  const active = state.players.filter(
    p => p.status !== PlayerStatus.Eliminated && p.status !== PlayerStatus.Waiting
  );
  if (active.length === 0) return state.dealerIndex;

  for (let i = 1; i <= state.players.length; i++) {
    const idx = (state.dealerIndex + i) % state.players.length;
    const p = state.players[idx];
    if (p.status !== PlayerStatus.Eliminated && p.status !== PlayerStatus.Waiting) {
      return idx;
    }
  }
  return state.dealerIndex;
}

/** 从指定座位后的下一位活跃玩家 */
function getNextActivePlayerFrom(state: GameState, fromIndex: number): number {
  for (let i = 1; i <= state.players.length; i++) {
    const idx = (fromIndex + i) % state.players.length;
    const p = state.players[idx];
    if (p.status === PlayerStatus.Active) return idx;
  }
  return fromIndex;
}

// ---- 处理玩家行动 ----

export interface ActionResult {
  success: boolean;
  error?: string;
  state: GameState;
  /** 本手牌是否结束 */
  handEnded: boolean;
}

/** 处理玩家行动 */
export function processAction(state: GameState, action: PlayerAction): ActionResult {
  const player = state.players.find(p => p.id === action.playerId);
  if (!player) return { success: false, error: '玩家不存在', state, handEnded: false };
  if (player.status !== PlayerStatus.Active && action.actionType !== ActionType.Fold) {
    return { success: false, error: '玩家不在活跃状态', state, handEnded: false };
  }

  const next = deepCloneState(state);

  // 标记该玩家本轮已行动
  if (!next.actedPlayerIds.includes(action.playerId)) {
    next.actedPlayerIds.push(action.playerId);
  }

  switch (action.actionType) {
    case ActionType.Fold:
      return handleFold(next, action.playerId);
    case ActionType.Check:
      return handleCheck(next, action.playerId);
    case ActionType.Call:
      return handleCall(next, action.playerId);
    case ActionType.Raise:
      return handleRaise(next, action.playerId, action.amount);
    case ActionType.AllIn:
      return handleAllIn(next, action.playerId);
    default:
      return { success: false, error: '未知行动类型', state, handEnded: false };
  }
}

function handleFold(state: GameState, playerId: string): ActionResult {
  const player = state.players.find(p => p.id === playerId)!;
  player.status = PlayerStatus.Folded;

  return advanceGame(state);
}

function handleCheck(state: GameState, playerId: string): ActionResult {
  const player = state.players.find(p => p.id === playerId)!;
  if (player.currentBet < state.currentBet) {
    return { success: false, error: '必须跟注或加注', state, handEnded: false };
  }

  return advanceGame(state);
}

function handleCall(state: GameState, playerId: string): ActionResult {
  const player = state.players.find(p => p.id === playerId)!;
  const toCall = Math.min(state.currentBet - player.currentBet, player.chips);

  player.chips -= toCall;
  player.currentBet += toCall;
  player.totalBet += toCall;

  if (player.chips === 0) {
    player.status = PlayerStatus.AllIn;
  }

  return advanceGame(state);
}

function handleRaise(state: GameState, playerId: string, amount: number): ActionResult {
  const player = state.players.find(p => p.id === playerId)!;
  const additionalChips = amount - player.currentBet; // 需要额外投入的筹码

  // 验证：加注总额必须大于当前桌上下注
  if (amount <= state.currentBet) {
    return { success: false, error: '加注额必须大于当前注额', state, handEnded: false };
  }
  // 验证：额外需要的筹码不能超过剩余筹码
  if (additionalChips > player.chips) {
    return { success: false, error: '筹码不足', state, handEnded: false };
  }

  // 只扣除额外投入的筹码（currentBet 中的筹码已经扣过了）
  player.chips -= additionalChips;
  player.currentBet = amount;
  player.totalBet += additionalChips;
  state.currentBet = amount;
  state.totalRoundBet = additionalChips; // 加注增量，用于计算后续最小加注

  if (player.chips === 0) {
    player.status = PlayerStatus.AllIn;
  }

  // 加注后，其他玩家需要重新回应（只保留加注者本身）
  state.actedPlayerIds = state.actedPlayerIds.filter(id => id === playerId);

  return advanceGame(state);
}

function handleAllIn(state: GameState, playerId: string): ActionResult {
  const player = state.players.find(p => p.id === playerId)!;
  const previousBet = player.currentBet;
  const allInAmount = player.chips;

  player.currentBet += allInAmount;
  player.totalBet += allInAmount;
  player.chips = 0;
  player.status = PlayerStatus.AllIn;

  if (player.currentBet > state.currentBet) {
    const raiseIncrement = player.currentBet - state.currentBet;
    const minRaise = Math.max(state.config.bigBlind, state.totalRoundBet);
    state.currentBet = player.currentBet;

    if (raiseIncrement >= minRaise) {
      // 有效加注（增量 ≥ 最小加注额）：更新加注增量，其他玩家需重新回应
      state.totalRoundBet = raiseIncrement;
    }
    // 无论是否有效加注，All-in 金额超过当前注额时其他玩家都需回应
    state.actedPlayerIds = state.actedPlayerIds.filter(id => id === playerId);
  }

  return advanceGame(state);
}

// ---- 推进游戏 ----

function advanceGame(state: GameState): ActionResult {
  const activePlayers = state.players.filter(
    p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
  );
  const canActPlayers = state.players.filter(p => p.status === PlayerStatus.Active);

  // 只剩一个活跃玩家（其他全弃牌）→ 直接赢
  if (activePlayers.length <= 1 && canActPlayers.length <= 1) {
    // 找到未弃牌的（可能是 All-in 或最后一个活跃）
    const lastPlayer = activePlayers[0];
    if (lastPlayer) {
      // 收底池
      const allBets = state.players.reduce((sum, p) => sum + p.totalBet, 0);
      lastPlayer.chips += allBets;
      state.pots = [];
    }
    return { success: true, state, handEnded: true };
  }

  // 检查是否可以推进阶段
  if (isRoundComplete(state)) {
    return nextPhase(state);
  }

  // 移到下一位活跃玩家
  const nextIdx = getNextActivePlayerIndex(state);
  if (nextIdx === state.currentPlayerIndex) {
    // 没有活跃玩家了，推进阶段
    return nextPhase(state);
  }

  state.currentPlayerIndex = nextIdx;
  return { success: true, state, handEnded: false };
}

/** 推进到下一阶段 */
function nextPhase(state: GameState): ActionResult {
  // 重置本轮下注 + 行动记录
  for (const p of state.players) {
    p.currentBet = 0;
  }
  state.currentBet = 0;
  state.totalRoundBet = 0;
  state.actedPlayerIds = [];

  const activePlayers = state.players.filter(
    p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
  );
  const canActPlayers = state.players.filter(p => p.status === PlayerStatus.Active);

  // 只剩最多一个可行动的玩家 → 结束
  if (canActPlayers.length <= 1 && activePlayers.length <= 1) {
    const lastPlayer = activePlayers[0];
    if (lastPlayer) {
      const allBets = state.players.reduce((sum, p) => sum + p.totalBet, 0);
      lastPlayer.chips += allBets;
      state.pots = [];
    }
    return { success: true, state, handEnded: true };
  }

  // 只剩 All-in 玩家 → 直接发完牌比大小
  if (canActPlayers.length === 0 && activePlayers.length >= 2) {
    // 继续发牌直到 river
    if (state.phase === GamePhase.PreFlop) {
      dealCommunity(state, 3); // flop
      state.phase = GamePhase.Flop;
      return nextPhase(state);
    } else if (state.phase === GamePhase.Flop) {
      dealCommunity(state, 1); // turn
      state.phase = GamePhase.Turn;
      return nextPhase(state);
    } else if (state.phase === GamePhase.Turn) {
      dealCommunity(state, 1); // river
      state.phase = GamePhase.River;
      return nextPhase(state);
    } else {
      return handleShowdown(state);
    }
  }

  switch (state.phase) {
    case GamePhase.PreFlop:
      burnCard(state.deck);
      dealCommunity(state, 3); // flop 三张
      state.phase = GamePhase.Flop;
      break;
    case GamePhase.Flop:
      burnCard(state.deck);
      dealCommunity(state, 1); // turn
      state.phase = GamePhase.Turn;
      break;
    case GamePhase.Turn:
      burnCard(state.deck);
      dealCommunity(state, 1); // river
      state.phase = GamePhase.River;
      break;
    case GamePhase.River:
      return handleShowdown(state);
    default:
      break;
  }

  // 设置下一轮第一个行动者（小盲位，即庄家后第一位）
  state.currentPlayerIndex = getNextActivePlayerFrom(state, state.dealerIndex);
  return { success: true, state, handEnded: false };
}

function dealCommunity(state: GameState, count: number): void {
  const cards = dealCards(state.deck, count);
  state.communityCards.push(...cards);
}

/** 摊牌比大小 */
function handleShowdown(state: GameState): ActionResult {
  state.phase = GamePhase.Showdown;

  // 收集所有未弃牌玩家的手牌评估
  const activePlayers = state.players.filter(
    p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
  );

  const playerHands = new Map<string, ReturnType<typeof evaluateBest>>();

  for (const p of activePlayers) {
    const allCards = [...p.holeCards, ...state.communityCards];
    if (allCards.length >= 5) {
      playerHands.set(p.id, evaluateBest(allCards));
    }
  }

  // 判定赢家
  const winners = determineWinners(playerHands);

  // 计算底池分配
  const allPlayers = state.players.filter(
    p => p.status !== PlayerStatus.Waiting
  );
  const pots = calculatePots(allPlayers);
  state.pots = pots;

  const distribution = distributePots(pots, winners, allPlayers, state.dealerIndex);

  // 分配筹码
  for (const [playerId, amount] of distribution) {
    const player = state.players.find(p => p.id === playerId);
    if (player) {
      player.chips += amount;
    }
  }

  // 标记淘汰
  for (const p of state.players) {
    if (p.chips === 0 && p.status !== PlayerStatus.Waiting) {
      p.status = PlayerStatus.Eliminated;
    }
  }

  return { success: true, state, handEnded: true };
}

// ---- 工具 ----

/** 快速深拷贝游戏状态（结构化克隆） */
function deepCloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

/** 导出用于测试的深拷贝 */
export { deepCloneState };

/** 检查游戏是否结束（只剩一个未淘汰玩家） */
export function isGameOver(state: GameState): boolean {
  const alive = state.players.filter(
    p => p.status !== PlayerStatus.Eliminated && p.status !== PlayerStatus.Waiting
  );
  return alive.length <= 1;
}

/** 获取本局赢家 */
export function getGameWinner(state: GameState): Player | null {
  const alive = state.players.filter(
    p => p.status !== PlayerStatus.Eliminated && p.status !== PlayerStatus.Waiting
  );
  return alive.length === 1 ? alive[0] : null;
}

/** 重置筹码开始新游戏 */
export function resetGame(state: GameState): GameState {
  for (const p of state.players) {
    if (p.status !== PlayerStatus.Waiting) {
      p.chips = state.config.initialChips;
      p.status = PlayerStatus.Active;
      p.holeCards = [];
      p.currentBet = 0;
      p.totalBet = 0;
    }
  }
  state.communityCards = [];
  state.pots = [];
  state.phase = GamePhase.Idle;
  state.deck = [];
  state.handNumber = 0;
  return state;
}
