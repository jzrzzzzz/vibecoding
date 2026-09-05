import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import {
  ActionType, PlayerStatus, getAvailableActions, GamePhase,
  evaluateBest, handTypeName,
} from '@nailong/engine';
import type { Card as CardType } from '@nailong/engine';
import Card from '@/components/Card';
import PlayerSeat from '@/components/PlayerSeat';
import ActionBar from '@/components/ActionBar';
import Pot from '@/components/Pot';
import styles from './GamePage.module.scss';

export default function GamePage() {
  const navigate = useNavigate();
  const {
    gameState, isPlaying, isHandOver, handOverMessage, actionLog,
    submitAction, nextHand, reset,
  } = useGameStore();

  if (!isPlaying || !gameState) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p>没有正在进行的游戏</p>
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const humanPlayer = gameState.players.find(p => !p.isAI);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer && !currentPlayer.isAI && !isHandOver;

  // 实时底池 = 所有玩家总投入
  const livePotTotal = gameState.players.reduce((sum, p) => sum + p.totalBet, 0);
  // 人类玩家本轮需跟注额
  const toCallThisRound = humanPlayer ? gameState.currentBet - humanPlayer.currentBet : 0;

  // 活跃玩家（非等待、非淘汰）
  const activePlayers = gameState.players.filter(
    p => p.status !== PlayerStatus.Waiting && p.status !== PlayerStatus.Eliminated
  );

  // 人类玩家合法操作
  const availableActions = useMemo(() => {
    if (!humanPlayer || isHandOver) return [];
    return getAvailableActions(gameState, humanPlayer);
  }, [gameState, humanPlayer, isHandOver]);

  // 计算座位位置：椭圆排列 + 向外偏移
  const tablePositions = getTablePositions(activePlayers, humanPlayer?.id ?? '');

  // 摊牌时计算每位活跃玩家的手牌
  const showdownResults = useMemo(() => {
    if (!isHandOver || gameState.phase !== GamePhase.Showdown) return null;
    const results: { playerId: string; handName: string; cards: CardType[]; isWinner: boolean }[] = [];
    const showdownPlayers = activePlayers.filter(
      p => p.status !== PlayerStatus.Folded
    );
    for (const p of showdownPlayers) {
      const allCards = [...p.holeCards, ...gameState.communityCards];
      if (allCards.length >= 5) {
        const hand = evaluateBest(allCards);
        results.push({
          playerId: p.id,
          handName: handTypeName(hand.type),
          cards: hand.cards,
          isWinner: false,
        });
      }
    }
    return results;
  }, [isHandOver, gameState.phase, activePlayers, gameState.communityCards]);

  const handleAction = (actionType: ActionType, amount: number) => {
    if (!humanPlayer) return;
    submitAction({ playerId: humanPlayer.id, actionType, amount });
  };

  const phaseLabel = getPhaseLabel(gameState.phase);

  return (
    <div className={styles.page}>
      {/* 顶部状态栏 */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => { reset(); navigate('/'); }}>
          ← 退出
        </button>
        <span className={styles.phase}>{phaseLabel}</span>
        <span className={styles.handNum}>第 {gameState.handNumber} 手</span>
      </div>

      {/* 主区域：牌桌 + 侧边栏 */}
      <div className={styles.mainArea}>
        {/* 牌桌 */}
        <div className={styles.table}>
          <div className={styles.felt}>
            {/* 所有玩家座位（围绕牌桌边缘） */}
            {activePlayers.map((player) => {
              const pos = tablePositions[player.id];
              if (!pos) return null;
              return (
                <div
                  key={player.id}
                  className={styles.seatPosition}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  }}
                >
                  <PlayerSeat
                    player={player}
                    isCurrent={currentPlayer?.id === player.id}
                    showCards={player.id === humanPlayer?.id || isHandOver}
                    isHuman={player.id === humanPlayer?.id}
                    isDealer={player.seatIndex === gameState.dealerIndex}
                    handName={isHandOver ? showdownResults?.find(r => r.playerId === player.id)?.handName : undefined}
                  />
                </div>
              );
            })}

            {/* 中央区域：公共牌 + 底池 */}
            <div className={styles.centerArea}>
              <div className={styles.communityCards}>
                {[0, 1, 2, 3, 4].map(i => {
                  const card = gameState.communityCards[i];
                  return (
                    <div key={i} className={styles.communityCardSlot}>
                      {card ? (
                        <Card card={card} highlighted={isHandOver} small />
                      ) : (
                        <div className={styles.emptyCard} />
                      )}
                    </div>
                  );
                })}
              </div>
              <Pot pots={gameState.pots} liveTotal={livePotTotal} />
            </div>
          </div>
        </div>

        {/* 右侧动作日志 */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>📋 动作记录</div>
          <div className={styles.logList}>
            {actionLog.length === 0 && (
              <div className={styles.logEmpty}>暂无记录</div>
            )}
            {[...actionLog].reverse().map((entry, i) => (
              <div key={i} className={styles.logEntry}>{entry.text}</div>
            ))}
          </div>
        </div>
      </div>

      {/* 实时信息条（始终可见） */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>底池</span>
          <span className={styles.statValue}>{livePotTotal}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>你的筹码</span>
          <span className={styles.statValue} style={{ color: humanPlayer && humanPlayer.chips > 0 ? '#FFD76D' : '#f44336' }}>
            {humanPlayer?.chips ?? 0}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>盲注</span>
          <span className={styles.statValue}>{gameState.config.smallBlind}/{gameState.config.bigBlind}</span>
        </div>
        {toCallThisRound > 0 && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>需跟注</span>
            <span className={styles.statValue}>{toCallThisRound}</span>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className={styles.bottomBar}>
        {isHumanTurn && !isHandOver && (
          <ActionBar
            availableActions={availableActions}
            currentBet={gameState.currentBet}
            playerBet={humanPlayer?.currentBet ?? 0}
            playerChips={humanPlayer?.chips ?? 0}
            potSize={livePotTotal}
            bigBlind={gameState.config.bigBlind}
            onAction={handleAction}
          />
        )}

        {!isHumanTurn && !isHandOver && (
          <div className={styles.waiting}>
            <span className={styles.waitIcon}>🤔</span>
            <span>{currentPlayer?.name} 思考中...</span>
          </div>
        )}
      </div>

      {/* 结算信息（底部面板，不遮挡牌桌） */}
      {isHandOver && (
        <div className={styles.settlement}>
          <div className={styles.settlementInner}>
            <div className={styles.settlementMsg}>
              🏆 <strong>{handOverMessage || '本局结束'}</strong>
            </div>

            {/* 各玩家手牌结果 */}
            {showdownResults && (
              <div className={styles.showdownResults}>
                {activePlayers
                  .filter(p => p.status !== PlayerStatus.Folded)
                  .map(p => {
                    const result = showdownResults.find(r => r.playerId === p.id);
                    return (
                      <span key={p.id} className={styles.playerResult}>
                        {p.isAI ? '🤖' : '⭐'} {p.name}：
                        <strong>{result?.handName ?? '—'}</strong>
                        &nbsp;💰{p.chips}
                      </span>
                    );
                  })}
              </div>
            )}

            <div className={styles.settlementBtns}>
              <button className="btn btn--primary" onClick={nextHand}>
                下一手 🎯
              </button>
              <button className="btn btn--danger" onClick={() => { reset(); navigate('/'); }}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 辅助函数 ----

function getPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.PreFlop: return '翻牌前';
    case GamePhase.Flop: return '翻牌';
    case GamePhase.Turn: return '转牌';
    case GamePhase.River: return '河牌';
    case GamePhase.Showdown: return '摊牌';
    default: return '';
  }
}

/**
 * 座位布局：长方形桌，上下两排
 *
 * AI 玩家均分到上排和下排，人类固定在下排正中间。
 * 每人占据等宽"格子"，物理上保证不会水平重叠。
 * 上排和下排之间有整个桌面高度隔离，垂直也不会重叠。
 */
function getTablePositions(
  players: { id: string; isAI: boolean }[],
  humanId: string
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  const aiPlayers = players.filter(p => p.id !== humanId);
  const n = aiPlayers.length;
  if (n === 0) {
    positions[humanId] = { x: 50, y: 88 };
    return positions;
  }

  // 分上下两排：上排多放一个（人类独占下排中间位置）
  const topCount = Math.ceil(n / 2);
  const bottomAICount = n - topCount;

  const topY = 10;      // 上排 y（%）
  const bottomY = 88;   // 下排 y（%）
  const spreadStart = 5; // x 起始（%）
  const spreadEnd = 95;  // x 结束（%）
  const spread = spreadEnd - spreadStart;

  // ---- 上排：topCount 个 AI 均分 ----
  for (let i = 0; i < topCount; i++) {
    const x = spreadStart + spread * (i + 0.5) / topCount;
    positions[aiPlayers[i].id] = { x: Math.round(x * 10) / 10, y: topY };
  }

  // ---- 下排：人类 + bottomAICount 个 AI ----
  const totalBottomSlots = bottomAICount + 1; // 含人类
  const humanSlot = Math.floor(totalBottomSlots / 2); // 人类在中间

  // 先算好所有格子位置
  const bottomSlotX: number[] = [];
  for (let i = 0; i < totalBottomSlots; i++) {
    bottomSlotX.push(spreadStart + spread * (i + 0.5) / totalBottomSlots);
  }

  // 人类放中间格子
  positions[humanId] = { x: Math.round(bottomSlotX[humanSlot] * 10) / 10, y: bottomY };

  // AI 填剩余格子
  let aiIdx = topCount; // 从上排之后的 AI 开始
  for (let i = 0; i < totalBottomSlots; i++) {
    if (i !== humanSlot && aiIdx < n) {
      positions[aiPlayers[aiIdx].id] = {
        x: Math.round(bottomSlotX[i] * 10) / 10,
        y: bottomY,
      };
      aiIdx++;
    }
  }

  return positions;
}
