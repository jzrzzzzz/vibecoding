import { describe, it, expect } from 'vitest';
import {
  GamePhase, ActionType, PlayerStatus, GameConfig,
} from '../src/types';
import {
  createGameState, createPlayer, startHand, processAction,
  isGameOver, getGameWinner, DEFAULT_CONFIG,
} from '../src/game-state';

function makePlayers(n: number = 4) {
  const players = [];
  for (let i = 0; i < n; i++) {
    players.push(createPlayer(
      `p${i}`,
      `玩家${i + 1}`,
      DEFAULT_CONFIG.initialChips,
      i,
      i > 0 // p0 is human, rest are AI
    ));
  }
  return players;
}

describe('startHand', () => {
  it('应该正确开始一手牌', () => {
    const players = makePlayers(4);
    let state = createGameState(players);
    state = startHand(state);

    // 检查阶段
    expect(state.phase).toBe(GamePhase.PreFlop);

    // 每个活跃玩家应有 2 张底牌
    for (const p of state.players) {
      expect(p.holeCards.length).toBe(2);
    }

    // 大盲应该下了大盲注
    const bbPlayer = state.players.find(p => p.totalBet === DEFAULT_CONFIG.bigBlind);
    expect(bbPlayer).toBeDefined();

    // 小盲应该下了小盲注
    const sbPlayer = state.players.find(p => p.totalBet === DEFAULT_CONFIG.smallBlind);
    expect(sbPlayer).toBeDefined();
  });

  it('手牌编号应该递增', () => {
    const players = makePlayers(4);
    let state = createGameState(players);
    expect(state.handNumber).toBe(0);
    state = startHand(state);
    expect(state.handNumber).toBe(1);
    state = startHand(state);
    expect(state.handNumber).toBe(2);
  });
});

describe('processAction - PreFlop', () => {
  it('Fold 应该标记玩家为弃牌', () => {
    const players = makePlayers(4);
    let state = createGameState(players);
    state = startHand(state);

    // 找到当前行动玩家
    const currentPlayer = state.players[state.currentPlayerIndex];

    const result = processAction(state, {
      playerId: currentPlayer.id,
      actionType: ActionType.Fold,
      amount: 0,
    });

    expect(result.success).toBe(true);
    const folded = result.state.players.find(p => p.id === currentPlayer.id);
    expect(folded!.status).toBe(PlayerStatus.Folded);
  });

  it('所有人弃牌后应该结束手牌', () => {
    const players = makePlayers(2); // 2 人对战
    let state = createGameState(players);
    state = startHand(state);

    // 当前玩家弃牌
    const current = state.players[state.currentPlayerIndex];
    const result = processAction(state, {
      playerId: current.id,
      actionType: ActionType.Fold,
      amount: 0,
    });

    expect(result.success).toBe(true);
    expect(result.handEnded).toBe(true);
    // 另一个玩家应获得筹码
    const other = result.state.players.find(p => p.id !== current.id);
    expect(other!.chips).toBeGreaterThanOrEqual(DEFAULT_CONFIG.initialChips);
  });

  it('All-in 应该清空玩家筹码并标记状态', () => {
    // 创建一个筹码极少的玩家来测试 All-in
    const poorPlayer = createPlayer('poor', '穷人', 50, 0);
    const richPlayer = createPlayer('rich', '富人', 1000, 1);
    let state = createGameState([poorPlayer, richPlayer]);
    state = startHand(state);

    // 对当前玩家执行 All-in
    const current = state.players[state.currentPlayerIndex];
    const result = processAction(state, {
      playerId: current.id,
      actionType: ActionType.AllIn,
      amount: 0,
    });

    expect(result.success).toBe(true);
    const updated = result.state.players.find(p => p.id === current.id);
    expect(updated!.chips).toBe(0);
    expect(updated!.status).toBe(PlayerStatus.AllIn);
  });
});

describe('完整游戏流程', () => {
  it('应该能走完 PreFlop → Flop → Turn → River → Showdown', () => {
    const players = makePlayers(4);
    let state = createGameState(players);
    state = startHand(state);

    let handEnded = false;
    let maxIter = 100; // 防止死循环

    while (!handEnded && maxIter-- > 0) {
      const currentPlayer = state.players[state.currentPlayerIndex];

      // 使用 Call/Check 来模拟"大家都跟注"的简化流程
      const toCall = state.currentBet - currentPlayer.currentBet;
      const actionType = toCall === 0 ? ActionType.Check : ActionType.Call;

      const result = processAction(state, {
        playerId: currentPlayer.id,
        actionType,
        amount: 0,
      });

      expect(result.success).toBe(true);
      state = result.state;
      handEnded = result.handEnded;
    }

    expect(maxIter).toBeGreaterThan(0); // 没有死循环
    expect(handEnded).toBe(true);
    expect(state.phase).toBe(GamePhase.Showdown);
  });
});

describe('isGameOver', () => {
  it('只剩一个玩家未淘汰时应该结束', () => {
    const players = makePlayers(4);
    players[0].status = PlayerStatus.Eliminated;
    players[2].status = PlayerStatus.Eliminated;
    players[3].status = PlayerStatus.Eliminated;
    let state = createGameState(players);
    expect(isGameOver(state)).toBe(true);
    const winner = getGameWinner(state);
    expect(winner!.id).toBe('p1');
  });
});
