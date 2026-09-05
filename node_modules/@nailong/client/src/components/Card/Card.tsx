// ============================================================
// 扑克牌组件
// 支持正面/背面渲染、花色颜色
// ============================================================

import { Card as CardType, suitSymbol, suitColor, rankSymbol } from '@nailong/engine';
import styles from './Card.module.scss';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  highlighted?: boolean;
  small?: boolean;
}

export default function Card({ card, faceDown = false, highlighted = false, small = false }: CardProps) {
  const classes = [
    styles.card,
    faceDown ? styles.faceDown : '',
    highlighted ? styles.highlighted : '',
    small ? styles.small : '',
  ].filter(Boolean).join(' ');

  // 牌背
  if (faceDown || !card) {
    return (
      <div className={classes}>
        <div className={styles.back}>
          <span className={styles.backIcon}>🐲</span>
          <span className={styles.backText}>NL</span>
        </div>
      </div>
    );
  }

  // 牌面
  const color = suitColor(card.suit);
  const symbol = suitSymbol(card.suit);
  const rank = rankSymbol(card.rank);

  return (
    <div className={`${classes} ${styles[color]}`}>
      <div className={styles.cornerTop}>
        <span className={styles.rank}>{rank}</span>
        <span className={styles.suit}>{symbol}</span>
      </div>
      <div className={styles.center}>
        <span className={styles.centerSuit}>{symbol}</span>
      </div>
      <div className={styles.cornerBottom}>
        <span className={styles.rank}>{rank}</span>
        <span className={styles.suit}>{symbol}</span>
      </div>
    </div>
  );
}
