// ============================================================
// 筹码组件 — 龙鳞纹路金币样式
// ============================================================

import styles from './Chip.module.scss';

interface ChipProps {
  amount: number;
  size?: 'small' | 'medium' | 'large';
}

export default function Chip({ amount, size = 'medium' }: ChipProps) {
  const classes = [styles.chip, styles[size]].join(' ');

  return (
    <div className={classes} title={`${amount} 筹码`}>
      <span className={styles.inner}>
        <span className={styles.dragonScale}>🐉</span>
        <span className={styles.amount}>{amount}</span>
      </span>
    </div>
  );
}
