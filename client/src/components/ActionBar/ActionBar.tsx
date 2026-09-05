// ============================================================
// 操作栏 — Fold / Check / Call / Raise / All-in
// 含预设加注按钮（1/2底池、2/3底池、底池大小、All-in）
// ============================================================

import { useState } from 'react';
import { ActionType } from '@nailong/engine';
import styles from './ActionBar.module.scss';

interface ActionBarProps {
  availableActions: { type: ActionType; minRaise?: number; maxRaise?: number }[];
  currentBet: number;
  playerBet: number;
  playerChips: number;
  potSize: number;
  bigBlind: number;
  onAction: (action: ActionType, amount: number) => void;
}

export default function ActionBar({
  availableActions,
  currentBet,
  playerBet,
  playerChips,
  potSize,
  bigBlind,
  onAction,
}: ActionBarProps) {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const toCall = currentBet - playerBet;

  const hasAction = (type: ActionType) => availableActions.some(a => a.type === type);
  const raiseAction = availableActions.find(a => a.type === ActionType.Raise);

  // 加注金额范围（总下注额，含跟注部分）
  const minTotal = raiseAction?.minRaise ?? (currentBet + bigBlind);
  const maxTotal = raiseAction?.maxRaise ?? playerChips;

  // 有效底池 = 当前底池 + 本玩家需跟注额（即跟注后的底池大小）
  const effectivePot = potSize + toCall;

  // 预设加注额（总金额），按底池百分比计算
  // 公式：总加注额 = 当前最高注额 + 比例 × (跟注后底池)
  const presetDefs = [
    { label: '最小', amount: minTotal },
    { label: '1/2池', amount: currentBet + Math.floor(effectivePot / 2) },
    { label: '满池', amount: currentBet + effectivePot },
  ];

  // 过滤：amount 必须 <= maxTotal，且至少为 minTotal；去重
  const seen = new Set<number>();
  const presets = presetDefs
    .map(p => ({ ...p, amount: Math.max(minTotal, Math.min(p.amount, maxTotal)) }))
    .filter(p => {
      if (p.amount > maxTotal || seen.has(p.amount)) return false;
      seen.add(p.amount);
      return true;
    });

  const handleRaise = (amount: number) => {
    const final = Math.max(minTotal, Math.min(amount, maxTotal));
    onAction(ActionType.Raise, final);
    setRaiseAmount(0);
  };

  return (
    <div className={styles.bar}>
      {/* 状态信息 */}
      <div className={styles.info}>
        {toCall > 0 && <span>需跟注: <strong>{toCall}</strong></span>}
        <span>底池: <strong>{potSize}</strong></span>
        <span>筹码: <strong>{playerChips}</strong></span>
      </div>

      {/* 操作按钮 */}
      <div className={styles.buttons}>
        {hasAction(ActionType.Fold) && (
          <button className={styles.fold} onClick={() => onAction(ActionType.Fold, 0)}>
            弃牌
          </button>
        )}

        {hasAction(ActionType.Check) && (
          <button className={styles.check} onClick={() => onAction(ActionType.Check, 0)}>
            过牌
          </button>
        )}

        {hasAction(ActionType.Call) && (
          <button className={styles.call} onClick={() => onAction(ActionType.Call, 0)}>
            跟注 {toCall}
          </button>
        )}

        {hasAction(ActionType.AllIn) && (
          <button className={styles.allin} onClick={() => onAction(ActionType.AllIn, playerChips)}>
            ALL IN! 💎
          </button>
        )}

        {hasAction(ActionType.Raise) && (
          <div className={styles.raiseGroup}>
            {/* 预设加注按钮 */}
            <div className={styles.presets}>
              {presets.map((preset, i) => (
                <button
                  key={i}
                  className={styles.presetBtn}
                  onClick={() => handleRaise(preset.amount)}
                >
                  {preset.label}<br/>{preset.amount}
                </button>
              ))}
            </div>

            {/* 自定义滑块 */}
            <div className={styles.customRaise}>
              <input
                type="range"
                min={minTotal}
                max={maxTotal}
                step={bigBlind}
                value={raiseAmount || minTotal}
                onChange={e => setRaiseAmount(Number(e.target.value))}
                className={styles.slider}
              />
              <button
                className={styles.raise}
                onClick={() => handleRaise(raiseAmount || minTotal)}
              >
                加注 {raiseAmount || minTotal}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
