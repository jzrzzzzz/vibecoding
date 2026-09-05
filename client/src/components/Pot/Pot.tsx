// ============================================================
// 底池显示组件
// ============================================================

import { Pot as PotType } from '@nailong/engine';
import Chip from '@/components/Chip';
import styles from './Pot.module.scss';

interface PotProps {
  pots: PotType[];
  /** 实时底池总额（牌局进行中，边池未计算前使用） */
  liveTotal?: number;
}

export default function Pot({ pots, liveTotal = 0 }: PotProps) {
  // 结算阶段用精确边池总额，否则用实时总额
  const potsTotal = pots.reduce((sum, p) => sum + p.amount, 0);
  const total = potsTotal > 0 ? potsTotal : liveTotal;
  if (total === 0) return null;

  return (
    <div className={styles.pot}>
      <div className={styles.chips}>
        <Chip amount={total} size="large" />
      </div>
      <span className={styles.label}>底池: {total}</span>
      {pots.length > 1 && (
        <div className={styles.sidePots}>
          {pots.map((p, i) => (
            <span key={i} className={styles.sidePot}>
              边池 {i + 1}: {p.amount}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
