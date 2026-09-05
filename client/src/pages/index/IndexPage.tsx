import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import styles from './IndexPage.module.scss';

export default function IndexPage() {
  const navigate = useNavigate();
  const {
    playerName, playerChips, aiCount, aiDifficulty,
    setPlayerName, setPlayerChips, setAICount, setAIDifficulty,
    startSinglePlayerGame,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);

  const handleStartGame = () => {
    startSinglePlayerGame();
    navigate('/game');
  };

  return (
    <div className={styles.page}>
      {/* 装饰元素 */}
      <div className={styles.decorLeft}>🐉</div>
      <div className={styles.decorRight}>🐉</div>

      {/* 主面板 */}
      <div className={styles.hero}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🐲</span>
          <h1 className={styles.title}>奶龙德州扑克</h1>
          <p className={styles.subtitle}>Nailong Texas Hold'em</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnPlay} onClick={handleStartGame}>
            🎮 开始人机对战
          </button>

          <button className={styles.btnRoom} onClick={() => navigate('/room')}>
            👥 创建好友房间
          </button>

          <button className={styles.btnJoin} onClick={() => navigate('/room?join=1')}>
            🔗 加入房间
          </button>

          <button
            className={styles.btnSettings}
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ 设置
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className={styles.settings}>

          <div className={styles.settingItem}>
            <label>你的昵称</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="输入昵称"
              maxLength={8}
            />
          </div>

          <div className={styles.settingItem}>
            <label>初始筹码</label>
            <input
              type="number"
              value={playerChips}
              onChange={e => setPlayerChips(Number(e.target.value))}
              min={100}
              max={10000}
              step={100}
            />
          </div>

          <div className={styles.settingItem}>
            <label>AI 数量 (1-8)</label>
            <input
              type="number"
              value={aiCount}
              onChange={e => setAICount(Number(e.target.value))}
              min={1}
              max={8}
            />
          </div>

          <div className={styles.settingItem}>
            <label>AI 难度</label>
            <select
              value={aiDifficulty}
              onChange={e => setAIDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            >
              <option value="easy">🟢 新手龙 — 简单</option>
              <option value="medium">🟡 机灵龙 — 中等</option>
              <option value="hard">🔴 智者龙 — 困难</option>
            </select>
          </div>
        </div>
      )}

      {/* 页脚 */}
      <footer className={styles.footer}>
        <p>🐲 奶龙德州扑克 v0.1 · 仅供娱乐</p>
      </footer>
    </div>
  );
}
