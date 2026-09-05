// ============================================================
// 游戏状态管理 — Zustand Store
// 管理牌桌游戏状态，连接引擎与 UI
// ============================================================

import { create } from 'zustand';
import {
  GameState, GamePhase, Player, Card, Pot,
  PlayerAction, ActionType, PlayerStatus,
  createGameState, createPlayer, startHand,
  processAction, isGameOver, getGameWinner,
  getAvailableActions,
  DEFAULT_CONFIG,
} from '@nailong/engine';
import { EasyAI } from '@nailong/engine';
import { MediumAI } from '@nailong/engine';
import { HardAI } from '@nailong/engine';
import { AIPlayerBase } from '@nailong/engine';
import type { GameStateView } from '@nailong/engine';

interface ActionLogEntry {
  time: number;
  text: string;
}

interface GameStore {
  // ---- 游戏状态 ----
  gameState: GameState | null;
  isPlaying: boolean;
  isHandOver: boolean;
  handOverMessage: string;

  // ---- 玩家设置 ----
  playerName: string;
  playerChips: number;
  aiCount: number;
  aiDifficulty: 'easy' | 'medium' | 'hard';

  // ---- 动作日志 ----
  actionLog: ActionLogEntry[];

  // ---- 操作 ----
  setPlayerName: (name: string) => void;
  setPlayerChips: (chips: number) => void;
  setAICount: (count: number) => void;
  setAIDifficulty: (diff: 'easy' | 'medium' | 'hard') => void;

  /** 初始化并开始单人游戏 */
  startSinglePlayerGame: () => void;

  /** 提交玩家操作 */
  submitAction: (action: PlayerAction) => void;

  /** AI 自动行动（内部调用） */
  executeAI: () => void;

  /** 继续下一手 */
  nextHand: () => void;

  /** 重置 */
  reset: () => void;
}

/** 生成动作描述文本（带 emoji 前缀） */
function describeAction(
  playerName: string,
  isAI: boolean,
  actionType: ActionType,
  amount: number,
  currentBet: number,
  playerBet: number,
): string {
  const prefix = isAI ? `🤖 ${playerName}` : `⭐ ${playerName}`;
  const toCall = currentBet - playerBet;
  switch (actionType) {
    case ActionType.Fold:
      return `${prefix} 弃牌 ✋`;
    case ActionType.Check:
      return `${prefix} 过牌 ✓`;
    case ActionType.Call:
      return `${prefix} 跟注 ${toCall}`;
    case ActionType.Raise:
      return `${prefix} 加注到 ${amount}`;
    case ActionType.AllIn:
      return `${prefix} 全下 ALL IN! 💎 (${playerBet + (playerBet < currentBet ? amount : amount)})`;
    default:
      return `${prefix} ${actionType}`;
  }
}

/** 生成阶段描述 */
function describePhase(phase: GamePhase): string | null {
  switch (phase) {
    case GamePhase.PreFlop:
      return '━━ 翻牌前：发放底牌 ━━';
    case GamePhase.Flop:
      return '━━ 翻牌：发放 3 张公共牌 ━━';
    case GamePhase.Turn:
      return '━━ 转牌：发放第 4 张公共牌 ━━';
    case GamePhase.River:
      return '━━ 河牌：发放第 5 张公共牌 ━━';
    default:
      return null;
  }
}

function getAIPlayer(difficulty: 'easy' | 'medium' | 'hard'): AIPlayerBase {
  switch (difficulty) {
    case 'easy': return new EasyAI();
    case 'medium': return new MediumAI();
    case 'hard': return new HardAI();
  }
}

/** 构建 AI 可见的游戏状态视图 */
function buildAIView(state: GameState, player: Player): GameStateView {
  return {
    phase: state.phase,
    communityCards: state.communityCards,
    pots: state.pots,
    currentBet: state.currentBet,
    config: state.config,
    self: player,
    opponents: state.players
      .filter(p => p.id !== player.id && p.status !== PlayerStatus.Waiting)
      .map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        holeCards: [], // 隐藏对手底牌
        status: p.status,
        currentBet: p.currentBet,
        totalBet: p.totalBet,
        seatIndex: p.seatIndex,
        isAI: p.isAI,
      })),
    activePlayerCount: state.players.filter(
      p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
    ).length,
    raiseCount: 0, // 简化：AI 不需要精确加注次数
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  isPlaying: false,
  isHandOver: false,
  handOverMessage: '',
  playerName: '你',
  playerChips: 1000,
  aiCount: 3,
  aiDifficulty: 'medium',
  actionLog: [],

  setPlayerName: (name) => set({ playerName: name }),
  setPlayerChips: (chips) => set({ playerChips: chips }),
  setAICount: (count) => set({ aiCount: Math.max(1, Math.min(8, count)) }),
  setAIDifficulty: (diff) => set({ aiDifficulty: diff }),

  startSinglePlayerGame: () => {
    const { playerName, playerChips, aiCount, aiDifficulty } = get();

    // 创建玩家
    const players: Player[] = [];
    players.push(createPlayer('human', playerName || '你', playerChips, 0, false));

    // 创建 AI
    const aiNames = ['奶龙小白', '奶龙小黄', '奶龙小绿', '奶龙小蓝', '奶龙小粉', '奶龙小紫', '奶龙小红', '奶龙小橙'];
    for (let i = 0; i < aiCount; i++) {
      players.push(createPlayer(
        `ai_${i}`,
        aiNames[i % aiNames.length],
        playerChips,
        i + 1,
        true,
        aiDifficulty
      ));
    }

    let state = createGameState(players, {
      ...DEFAULT_CONFIG,
      initialChips: playerChips,
    });

    state = startHand(state);
    set({
      gameState: state,
      isPlaying: true,
      isHandOver: false,
      handOverMessage: '',
      actionLog: [
        { time: Date.now(), text: '🎮 游戏开始！' },
        { time: Date.now(), text: describePhase(GamePhase.PreFlop)! },
      ],
    });

    // 如果当前轮到 AI，自动执行
    setTimeout(() => get().executeAI(), 1200);
  },

  submitAction: (action) => {
    const { gameState, isHandOver, actionLog } = get();
    if (!gameState || isHandOver) return;

    const oldPhase = gameState.phase;
    const player = gameState.players.find(p => p.id === action.playerId);
    if (!player) return;

    const result = processAction(gameState, action);
    if (!result.success) {
      console.warn('操作无效:', result.error);
      return;
    }

    const newState = result.state;

    // 记录玩家动作
    const newLog = [...actionLog, {
      time: Date.now(),
      text: describeAction(
        player.name, player.isAI,
        action.actionType, action.amount,
        gameState.currentBet, gameState.players.find(p => p.id === action.playerId)!.currentBet,
      ),
    }];

    // 检测阶段变化
    if (newState.phase !== oldPhase) {
      const phaseText = describePhase(newState.phase);
      if (phaseText) newLog.push({ time: Date.now(), text: phaseText });
    }

    set({ gameState: newState, isHandOver: result.handEnded, actionLog: newLog });

    if (result.handEnded) {
      const winner = getGameWinner(newState);
      if (winner) {
        set({ handOverMessage: `${winner.name} 赢得本局！` });
        // 记录摊牌结果
        const logWithResult = [...get().actionLog, {
          time: Date.now(),
          text: `🏆 ${winner.name} 赢得本局！`,
        }];
        set({ actionLog: logWithResult });
      } else {
        set({ handOverMessage: '本局结束！' });
      }
    } else {
      setTimeout(() => get().executeAI(), 1200);
    }
  },

  /** AI 自动行动 */
  executeAI: () => {
    const { gameState, isHandOver, aiDifficulty, actionLog } = get();
    if (!gameState || isHandOver) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI) return;

    const oldPhase = gameState.phase;
    const currentBet = gameState.currentBet;
    const playerBet = currentPlayer.currentBet;

    const ai = getAIPlayer(currentPlayer.aiDifficulty || aiDifficulty);
    const view = buildAIView(gameState, currentPlayer);
    const decision = ai.decide(view);

    const action: PlayerAction = {
      playerId: currentPlayer.id,
      actionType: decision.action,
      amount: decision.amount,
    };

    const result = processAction(gameState, action);
    if (result.success) {
      const newState = result.state;

      // 记录 AI 动作
      const newLog = [...actionLog, {
        time: Date.now(),
        text: describeAction(
          currentPlayer.name, true,
          action.actionType, action.amount,
          currentBet, playerBet,
        ),
      }];

      // 检测阶段变化
      if (newState.phase !== oldPhase) {
        const phaseText = describePhase(newState.phase);
        if (phaseText) newLog.push({ time: Date.now(), text: phaseText });
      }

      set({ gameState: newState, isHandOver: result.handEnded, actionLog: newLog });

      if (result.handEnded) {
        const winner = getGameWinner(result.state);
        if (winner) {
          set({ handOverMessage: `${winner.name} 赢得本局！` });
          const logWithResult = [...get().actionLog, {
            time: Date.now(),
            text: `🏆 ${winner.name} 赢得本局！`,
          }];
          set({ actionLog: logWithResult });
        } else {
          set({ handOverMessage: '本局结束！' });
        }
      } else {
        const nextPlayer = result.state.players[result.state.currentPlayerIndex];
        if (nextPlayer?.isAI) {
          setTimeout(() => get().executeAI(), 1200);
        }
      }
    }
  },

  nextHand: () => {
    const { gameState } = get();
    if (!gameState) return;

    if (isGameOver(gameState)) {
      get().startSinglePlayerGame();
      return;
    }

    const state = startHand(gameState);
    set({
      gameState: state,
      isHandOver: false,
      handOverMessage: '',
      actionLog: [
        { time: Date.now(), text: '🔄 下一手牌' },
        { time: Date.now(), text: describePhase(GamePhase.PreFlop)! },
      ],
    });

    setTimeout(() => get().executeAI(), 1200);
  },

  reset: () => {
    set({
      gameState: null,
      isPlaying: false,
      isHandOver: false,
      handOverMessage: '',
      actionLog: [],
    });
  },
}));
