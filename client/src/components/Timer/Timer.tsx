// ============================================================
// 倒计时组件 — 环形进度条
// ============================================================

import { useEffect, useState } from 'react';
import styles from './Timer.module.scss';

interface TimerProps {
  seconds: number;
  running: boolean;
  onTimeout: () => void;
}

export default function Timer({ seconds, running, onTimeout }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    setRemaining(seconds);
    setFired(false);
  }, [seconds, running]);

  useEffect(() => {
    if (!running || remaining <= 0 || fired) return;

    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!fired) {
            setFired(true);
            setTimeout(() => onTimeout(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, fired, onTimeout]);

  const progress = seconds > 0 ? remaining / seconds : 0;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - progress);
  const urgent = remaining <= 5;
  const critical = remaining <= 3;

  if (!running) return null;

  return (
    <div className={`${styles.timer} ${urgent ? styles.urgent : ''} ${critical ? styles.critical : ''}`}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="5"
        />
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke={urgent ? '#EF5350' : '#FFD76D'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className={styles.text}>{remaining}</span>
    </div>
  );
}
