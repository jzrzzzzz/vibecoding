import { Player, PlayerStatus } from '@nailong/engine';
import Card from '@/components/Card';
import Chip from '@/components/Chip';
import styles from './PlayerSeat.module.scss';

interface PlayerSeatProps {
  player: Player;
  isCurrent: boolean;
  showCards: boolean;
  isHuman: boolean;
  isDealer?: boolean;
  /** 摊牌时显示的手牌类型名称 */
  handName?: string;
}

export default function PlayerSeat({ player, isCurrent, showCards, isHuman, isDealer, handName }: PlayerSeatProps) {
  const statusLabel = getStatusLabel(player.status);
  const emoji = getEmoji(player.status, isCurrent, player.isAI);

  return (
    <div className={`${styles.seat} ${isCurrent ? styles.current : ''} ${player.status === PlayerStatus.Folded ? styles.folded : ''}`}>
      {/* 头像区域 */}
      <div className={styles.avatar}>
        <span className={styles.emoji}>{emoji}</span>
        {isDealer && <span className={styles.dealerBadge} title="庄家">🅳</span>}
        {player.status === PlayerStatus.Eliminated && <span className={styles.eliminated}>💀</span>}
      </div>

      {/* 玩家信息 */}
      <div className={styles.info}>
        <span className={styles.name}>
          {player.isAI ? '🤖 ' : isHuman ? '⭐ ' : ''}{player.name}
        </span>
        <span className={styles.chips}>
          💰 <strong>{player.chips}</strong>
        </span>
      </div>

      {/* 状态标签（紧凑模式隐藏） */}
      {statusLabel && (
        <div className={styles.statusBadge}>{statusLabel}</div>
      )}

      {/* 手牌类型（摊牌时） */}
      {handName && (
        <div className={styles.handName}>{handName}</div>
      )}

      {/* 底牌 */}
      {player.holeCards.length > 0 && (
        <div className={styles.cards}>
          {player.holeCards.map((card, i) => (
            <Card
              key={i}
              card={showCards ? card : undefined}
              faceDown={!showCards && !isHuman}
              small
            />
          ))}
        </div>
      )}

      {/* 当前下注（紧凑模式隐藏） */}
      {player.currentBet > 0 && (
        <div className={styles.bet}>
          <Chip amount={player.currentBet} size="small" />
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status: PlayerStatus): string {
  switch (status) {
    case PlayerStatus.Folded: return '弃牌';
    case PlayerStatus.AllIn: return 'ALL IN!';
    case PlayerStatus.Eliminated: return '淘汰';
    default: return '';
  }
}

function getEmoji(status: PlayerStatus, isCurrent: boolean, isAI: boolean): string {
  if (status === PlayerStatus.Eliminated) return '😵';
  if (status === PlayerStatus.Folded) return '😔';
  if (status === PlayerStatus.AllIn) return '😤';
  if (isCurrent) return '🤔';
  if (isAI) return '🐲';
  return '😊';
}
